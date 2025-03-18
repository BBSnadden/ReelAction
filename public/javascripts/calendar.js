document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const calendarBody = document.getElementById('calendarBody');
    const monthAndYear = document.getElementById('monthAndYear');
    const prevMonthButton = document.getElementById('prevMonth');
    const nextMonthButton = document.getElementById('nextMonth');
    const changeCalendarButton = document.getElementById('change');
    const monthDropdown = document.getElementById('monthSelect');
    const yearDropdown = document.getElementById('yearSelect');

    // Date and month initialization
    const today = new Date();
    const months = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    let currentMonth = today.getMonth() + 1;
    let currentYear = today.getFullYear();

    // Populate year dropdown
    function populateYearDropdown() {
        yearDropdown.innerHTML = '';
        const currentYear = new Date().getFullYear();

        for (let year = currentYear - 3; year <= currentYear + 3; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearDropdown.appendChild(option);
        }

        yearDropdown.value = currentYear;
    }

    // Format the date without timezone
    function formatDateWithoutTimeZone(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Create empty cell
    function createEmptyCell() {
        const cell = document.createElement('td');
        cell.appendChild(document.createTextNode(""));
        return cell;
    }

    // Fetch the authentication status to determine user type (customer/admin)
    async function fetchAuthStatus() {
        try {
            const response = await fetch('/auth-status');
            const data = await response.json();
            return data.isAuthenticated; // Assuming `isAuthenticated` indicates an admin
        } catch (error) {
            console.error('Error checking authentication status:', error);
            return false;
        }
    }



    function findEarliestBooking(charters, formattedDate) {
        const bookingsForDate = charters.filter(c => {
            const charterDate = c.date.split('T')[0]; // Extract the date part
            return charterDate === formattedDate;
        });


        if (bookingsForDate.length > 0) {
            const earliestBooking = bookingsForDate.reduce((earliest, current) => {
                return new Date(current.created_date) < new Date(earliest.created_date)
                    ? current
                    : earliest;
            });
            return earliestBooking;
        }
        return null; // No bookings for this date
    }

    // Apply styles based on charter type and date status
    function applyCellStyles(cell, charter, date) {
        console.log('applyCellStyles invoked with:', { charter, date });

        // Clear existing content
        cell.innerHTML = '';

        // Add the date span
        const dateSpan = document.createElement('span');
        dateSpan.classList.add('date');
        dateSpan.textContent = date.getDate(); // Display the date
        cell.appendChild(dateSpan);

        // Add a content span for charter details
        const contentSpan = document.createElement('span');

        if (date < today) {
            cell.classList.add('unavailable');
            contentSpan.textContent = 'Unavailable';
        } else if (charter) {
            console.log('Charter data:', charter); // Debug the charter object
            const { charter_type, spots_left, booking_status } = charter;

            if (booking_status === 'unavailable') {
                cell.classList.add('unavailable');
                contentSpan.textContent = 'Unavailable';
            } else if (booking_status === 'booked' || spots_left <= 0) { 
                // If the charter is marked as booked or has 0 or negative spots left
                cell.classList.add('booked');
                contentSpan.textContent = `${charter_type} - Fully Booked`;
            } else if (booking_status === 'tentative') {
                cell.classList.add('tentative');
                contentSpan.textContent = `${charter_type} - ${spots_left} spots left`;
            } else {
                // Default to available status
                cell.classList.add('available');
                contentSpan.textContent = `${charter_type} - ${spots_left} spots left`;
            }
        } else {
            console.log('No charter found for this date:', date);
            cell.classList.add('available');
            contentSpan.textContent = 'Available';
        }

        // Append the content span after the date span
        cell.appendChild(contentSpan);
    }



    function createDateCell(date, charters) {
        const cell = document.createElement('td');
        const dateSpan = document.createElement('span');
        dateSpan.classList.add('date');
        dateSpan.textContent = date.getDate();
        cell.appendChild(dateSpan);

        const formattedDate = formatDateWithoutTimeZone(date);

        // Find the earliest booking for this date
        const charter = findEarliestBooking(charters, formattedDate);

        if (!charter) {
            console.log(`No charter found for date: ${formattedDate}`);
        }

        // Apply styles and content based on the earliest booking or availability
        applyCellStyles(cell, charter, date);

        // Ensure the click event listener is added
        cell.addEventListener('click', async () => {
            const isAuthenticated = await fetchAuthStatus();

            if (!cell.classList.contains('unavailable') && !cell.classList.contains('booked') || isAuthenticated) {
                // Admins can click unavailable days, regular users can’t
                const targetPage = isAuthenticated ? 'adminBookings.html' : 'customerBookings.html';
                window.location.href = `/${targetPage}?date=${encodeURIComponent(formattedDate)}`;
            } else {
                console.log('Cell is unavailable for clicking.');
            }
        });

        return cell;
    }


    function normalizeCharterDates(charters) {
        return charters.map(charter => {
            // Parse the existing date
            const originalDate = new Date(charter.date);

            // Add one day (24 hours in milliseconds)
            const adjustedDate = new Date(originalDate.getTime() + 24 * 60 * 60 * 1000);

            // Format back to YYYY-MM-DD
            const adjustedDateString = adjustedDate.toISOString().split('T')[0];

            console.log(`Original date: ${charter.date}, Adjusted date: ${adjustedDateString}`); // Debugging

            return {
                ...charter,
                date: adjustedDateString // Replace the date with the adjusted one
            };
        });
    }




    // Generate the calendar for a given month and year
    function generateCalendar(month, year) {
        console.log(`generateCalendar invoked for month: ${month}, year: ${year}`);

        calendarBody.innerHTML = "";
        monthAndYear.textContent = `${months[month]} ${year}`;

        fetch(`/charters/month/${year}/${month.toString().padStart(2, '0')}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(charters => {
            console.log('Fetched charters before normalization:', charters);

            // Normalize dates to local timezone
            const normalizedCharters = normalizeCharterDates(charters);

            console.log('Fetched charters after normalization:', normalizedCharters);

            const firstDay = (new Date(year, month - 1).getDay() + 6) % 7;
            const daysInMonth = 32 - new Date(year, month - 1, 32).getDate();

            let date = 1;
            for (let i = 0; i < 6; i++) {
                const row = document.createElement('tr');
                let emptyRow = true;

                for (let j = 0; j < 7; j++) {
                    if (i === 0 && j < firstDay) {
                        row.appendChild(createEmptyCell());
                    } else if (date <= daysInMonth) {
                        emptyRow = false;
                        const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
                        const cell = createDateCell(new Date(year, month - 1, date), normalizedCharters);
                        row.appendChild(cell);
                        date++;
                    } else {
                        row.appendChild(createEmptyCell());
                    }
                }

                if (!emptyRow) calendarBody.appendChild(row);
            }
        })
        .catch(error => console.error('Error fetching charters:', error));

    }


    // Event listeners for navigation
    prevMonthButton.addEventListener('click', function () {
        currentYear = (currentMonth === 1) ? currentYear - 1 : currentYear;
        currentMonth = (currentMonth === 1) ? 12 : currentMonth - 1;
        generateCalendar(currentMonth, currentYear);
    });

    nextMonthButton.addEventListener('click', function () {
        currentYear = (currentMonth === 12) ? currentYear + 1 : currentYear;
        currentMonth = (currentMonth % 12) + 1;
        generateCalendar(currentMonth, currentYear);
    });

    changeCalendarButton.addEventListener('click', function () {
        currentYear = parseInt(yearDropdown.value, 10);
        currentMonth = parseInt(monthDropdown.value, 10) + 1;
        generateCalendar(currentMonth, currentYear);
    });

    // Initialize dropdown and calendar
    populateYearDropdown();
    generateCalendar(currentMonth, currentYear);
});
