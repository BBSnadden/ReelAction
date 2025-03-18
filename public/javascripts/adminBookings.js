document.addEventListener('DOMContentLoaded', async () => {
    // Perform authentication check immediately
    try {
        const authResponse = await fetch('/auth-status');
        const { isAuthenticated } = await authResponse.json();

        if (!isAuthenticated) {
            alert('You are not authorized to access this page. Please log in as an admin.');
            window.location.href = '/login.html';
            return; // Prevent further script execution
        }
    } catch (error) {
        console.error('Error checking authentication status:', error);
        alert('An error occurred. Please try logging in again.');
        window.location.href = '/login.html';
        return;
    }

    // URL parameter extraction
    const urlParams = new URLSearchParams(window.location.search);
    const date = urlParams.get('date');
    const dateElement = document.getElementById('date');
    if (dateElement) {
        dateElement.textContent = formatDisplayDate(date);
    }

    let deleteButtonClickedOnce = false;

    // Add event listener for the delete button
    const deleteCharterButton = document.getElementById('deleteCharterButton');
    if (deleteCharterButton) {
        deleteCharterButton.addEventListener('click', async () => {
            if (!deleteButtonClickedOnce) {
                alert('Press again to confirm deletion of this charter.');
                deleteButtonClickedOnce = true;

                // Reset after a short timeout if not clicked again
                setTimeout(() => {
                    deleteButtonClickedOnce = false;
                }, 3000); // 3 seconds timeout
                return;
            }

            // Proceed with deletion
            try {
                const response = await fetch(`/charters/delete-charter`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date }),
                });

                if (response.ok) {
                    alert('Charter deleted successfully!');
                    window.location.href = '/calendar'; // Redirect to calendar or other page
                } else {
                    const error = await response.json();
                    alert(`Failed to delete charter: ${error.message}`);
                }
            } catch (error) {
                console.error('Error deleting charter:', error);
                alert('An error occurred while deleting the charter.');
            }
        });
    }

    // Fetch and display bookings
    async function fetchBookings() {
        try {
            const response = await fetch(`/charters/day/${date}`);
            const { charter, bookings } = await response.json();
            updateCharterDetails(charter);
            populateBookingsTable(bookings);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    }

    function updateCharterDetails(charter) {
        if (!charter) {
            console.warn('No charter data received');
            return;
        }

        const charterType = document.getElementById('charterType');
        const boatCapacity = document.getElementById('boatCapacity');
        const spotsLeft = document.getElementById('spotsLeft');
        const charterStatus = document.getElementById('charterStatus');
        const charterDescription = document.getElementById('charterDescription');
        const notes = document.getElementById('notes');

        if (charterType) charterType.textContent = charter.charter_type || 'N/A';
        if (boatCapacity) boatCapacity.textContent = charter.boat_capacity || 'N/A';
        if (spotsLeft) spotsLeft.textContent =
            charter.boat_capacity - charter.total_booked || 'N/A';
        if (charterStatus) charterStatus.textContent = charter.booking_status || 'N/A';
        if (charterDescription) charterDescription.textContent = charter.charter_description || 'N/A';
        if (notes) notes.textContent = charter.notes || 'N/A';
    }

    // Toggle between edit and view mode for charter details
    const editButton = document.getElementById('editCharterDetails');
    const saveButton = document.getElementById('saveCharterDetails');

    if (editButton && saveButton) {
        editButton.addEventListener('click', () => {
            toggleCharterDetailsEditMode(true);
        });

        saveButton.addEventListener('click', async () => {
            const updatedCharter = {
                date,
                charter_type: document.getElementById('charterTypeInput').value,
                boat_capacity: parseInt(document.getElementById('boatCapacityInput').value, 10),
                charter_status: document.getElementById('charterStatusInput').value,
                charter_description: document.getElementById('charterDescriptionInput').value || null,
                notes: document.getElementById('notesInput').value || null,
            };

            try {
                const response = await fetch('/charters/update-charter', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedCharter),
                });

                if (response.ok) {
                    alert('Charter details updated successfully!');
                    toggleCharterDetailsEditMode(false);
                    updateCharterDetails(updatedCharter);
                } else {
                    alert('Failed to update charter details.');
                }
            } catch (error) {
                console.error('Error updating charter details:', error);
                alert('An error occurred while saving the updates.');
            }
        });
    }

    function toggleCharterDetailsEditMode(isEditing) {
        if (deleteCharterButton) {
            deleteCharterButton.style.display = isEditing ? 'inline' : 'none';
        }

        const editModeElements = [
            'charterTypeInput',
            'boatCapacityInput',
            'charterStatusInput',
            'charterDescriptionInput',
            'notesInput',
        ];
        const viewModeElements = [
            'charterType',
            'boatCapacity',
            'charterStatus',
            'charterDescription',
            'notes',
        ];

        editModeElements.forEach((id, index) => {
            const inputElement = document.getElementById(id);
            const viewElement = document.getElementById(viewModeElements[index]);

            if (inputElement && viewElement) {
                if (isEditing) {
                    // Set input value to the text content of the corresponding view element
                    inputElement.value = viewElement.textContent.trim();
                    inputElement.style.display = 'inline';
                } else {
                    inputElement.style.display = 'none';
                }
            }
        });

        viewModeElements.forEach((id) => {
            const viewElement = document.getElementById(id);
            if (viewElement) {
                viewElement.style.display = isEditing ? 'none' : 'inline';
            }
        });

        if (editButton) editButton.style.display = isEditing ? 'none' : 'inline';
        if (saveButton) saveButton.style.display = isEditing ? 'inline' : 'none';
    }


    function populateBookingsTable(bookings) {
        const tableBody = document.getElementById('bookingsTableBody');
        if (!tableBody) {
            console.error('Bookings table body element not found');
            return;
        }

        tableBody.innerHTML = ''; // Clear the table body

        bookings.forEach(booking => {
            const row = document.createElement('tr');
            const bookingDate = booking.date || date;

            row.innerHTML = `
                <td data-field="fullName">${booking.full_name || ''}</td>
                <td data-field="phoneNumber">${booking.phone_number || ''}</td>
                <td data-field="email">${booking.email || ''}</td>
                <td data-field="charterType">${booking.charter_type || ''}</td>
                <td data-field="status">${booking.status || ''}</td>
                <td data-field="numberOfPeople">${booking.number_of_people || ''}</td>
                <td data-field="bookingTotal">${booking.booking_total || ''}</td>
                <td data-field="depositPaid">${booking.deposit_paid || ''}</td>
                <td data-field="date">${bookingDate}</td>
                <td>
                    <button data-id="${booking.id}" class="edit-btn">Edit</button>
                    <button data-id="${booking.id}" class="delete-btn">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
            row.querySelector('.edit-btn').addEventListener('click', handleEditBooking);
            row.querySelector('.delete-btn').addEventListener('click', handleDeleteBooking);
        });
    }

    function handleEditBooking(event) {
        const row = event.target.closest('tr');
        const bookingId = event.target.getAttribute('data-id');

        if (!row) {
            console.error('Row not found for editing.');
            return;
        }

        Array.from(row.children).forEach((cell) => {
            const field = cell.getAttribute('data-field');
            if (field) {
                const currentValue = cell.textContent.trim();

                if (field === 'charterType') {
                    cell.innerHTML = `
                        <select data-field="${field}">
                            <option value="tuna" ${currentValue === 'tuna' ? 'selected' : ''}>Tuna</option>
                            <option value="reef" ${currentValue === 'reef' ? 'selected' : ''}>Reef</option>
                            <option value="tuna and reef" ${currentValue === 'tuna and reef' ? 'selected' : ''}>Tuna & Reef</option>
                        </select>
                    `;
                } else if (field === 'status') {
                    cell.innerHTML = `
                        <select data-field="${field}">
                            <option value="booked" ${currentValue === 'booked' ? 'selected' : ''}>Booked</option>
                            <option value="tentative" ${currentValue === 'tentative' ? 'selected' : ''}>Tentative</option>
                            <option value="cancelled" ${currentValue === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            <option value="rescheduled" ${currentValue === 'rescheduled' ? 'selected' : ''}>Rescheduled</option>
                        </select>
                    `;
                } else if (field === 'date') {
                    // Convert SQL date (yyyy-mm-dd) to dd-mm-yyyy
                    const formattedDate = currentValue.split('-').reverse().join('-');
                    cell.innerHTML = `<input type="text" data-field="${field}" value="${formattedDate}" placeholder="dd-mm-yyyy" />`;
                } else {
                    cell.innerHTML = `<input type="text" data-field="${field}" value="${currentValue}" />`;
                }
            }
        });

        // Replace Edit button with Save button
        const editButton = row.querySelector(`.edit-btn[data-id="${bookingId}"]`);
        if (!editButton) {
            console.error('Edit button not found for booking ID:', bookingId);
            return;
        }

        editButton.textContent = 'Save';
        editButton.classList.remove('edit-btn');
        editButton.classList.add('save-btn');
        editButton.removeEventListener('click', handleEditBooking);
        editButton.addEventListener('click', handleSaveBooking);
    }




    async function handleSaveBooking(event) {
        const row = event.target.closest('tr');
        const bookingId = event.target.getAttribute('data-id');

        const updatedData = {};
        let hasError = false;

        Array.from(row.children).forEach((cell) => {
            const input = cell.querySelector('input, select'); // Select both input fields and dropdowns

            if (input) {
                const field = input.getAttribute('data-field');
                let value = input.value.trim(); // Trim whitespace

                if (field === 'charterType' && !value) {
                    hasError = true;
                    alert('Charter type cannot be empty.');
                }

                if (field === 'status' && !['booked', 'tentative', 'cancelled', 'rescheduled'].includes(value)) {
                    hasError = true;
                    alert('Invalid status selected.');
                }

                if (field === 'numberOfPeople' || field === 'bookingTotal' || field === 'depositPaid') {
                    value = parseFloat(value);
                    if (isNaN(value) || value < 0) {
                        hasError = true;
                        alert(`${field.replace(/([A-Z])/g, ' $1')} must be a valid positive number.`);
                    }
                }

                if (field === 'date') {
                    // Convert dd-mm-yyyy to yyyy-mm-dd before saving
                    const dateParts = value.split('-');
                    if (dateParts.length === 3) {
                        value = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // Convert to SQL format
                    } else {
                        hasError = true;
                        alert('Invalid date format. Please use dd-mm-yyyy.');
                    }
                }

                const snakeCaseField = {
                    fullName: 'full_name',
                    phoneNumber: 'phone_number',
                    email: 'email',
                    charterType: 'charter_type',
                    status: 'status',
                    numberOfPeople: 'number_of_people',
                    bookingTotal: 'booking_total',
                    depositPaid: 'deposit_paid',
                    date: 'date',
                };

                updatedData[snakeCaseField[field]] = value;
            }
        });

        if (hasError) return;

        try {
            const response = await fetch(`/charters/customer-booking/${bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });

            if (response.ok) {
                alert('Booking updated successfully!');
                fetchBookings(); // Refresh bookings
            } else {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                alert(`Failed to update booking: ${errorText}`);
            }
        } catch (error) {
            console.error('Error saving booking:', error);
            alert('An error occurred while saving the booking.');
        }
    }

    document.getElementById('moveBookingsButton').addEventListener('click', async () => {
        const newDateInput = document.getElementById('newBookingDate');
        const newDate = newDateInput.value.trim();

        if (!newDate) {
            alert("Please select a new date.");
            return;
        }

        try {
            // Step 1: Fetch all bookings for the selected date
            const response = await fetch(`/charters/day/${date}`);
            if (!response.ok) throw new Error("Failed to fetch bookings.");
        
            const { bookings } = await response.json();
            if (bookings.length === 0) {
                alert("No bookings found for this date.");
                return;
            }

            // Step 2: Loop through bookings and call the existing PUT /customer-booking/:id route
            for (const booking of bookings) {
                const bookingUpdate = {
                    full_name: booking.full_name,
                    phone_number: booking.phone_number,
                    email: booking.email,
                    state: booking.state,
                    date: newDate, // New date
                    number_of_people: booking.number_of_people,
                    charter_type: booking.charter_type,
                    heard_about_us: booking.heard_about_us,
                    status: booking.status,
                    booking_total: booking.booking_total,
                    deposit_paid: booking.deposit_paid
                };

                const updateResponse = await fetch(`/charters/customer-booking/${booking.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingUpdate)
                });

                if (!updateResponse.ok) {
                    console.error(`Failed to move booking ID ${booking.id}`);
                }
            }

            fetchBookings(); // Refresh the table

        } catch (error) {
            console.error('Error moving bookings:', error);
            alert('An error occurred while moving the bookings.');
        }
    });



    let deleteBookingClickedOnce = {}; // Track the delete state for each booking ID

    async function handleDeleteBooking(event) {
        const bookingId = event.target.getAttribute('data-id');

        if (!bookingId) {
            console.error('No booking ID found.');
            return;
        }

        if (!deleteBookingClickedOnce[bookingId]) {
            alert('Press again to confirm deletion of this booking.');
            deleteBookingClickedOnce[bookingId] = true;

            // Reset the flag for this booking ID after 3 seconds
            setTimeout(() => {
                deleteBookingClickedOnce[bookingId] = false;
            }, 3000);
            return;
        }

        // Proceed with deletion
        try {
            const response = await fetch(`/charters/customer-booking/${bookingId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                alert('Booking deleted successfully!');
                deleteBookingClickedOnce[bookingId] = false; // Reset the state after successful deletion
                fetchBookings(); // Refresh bookings
            } else {
                const error = await response.json();
                alert(`Failed to delete booking: ${error.message}`);
            }
        } catch (error) {
            console.error('Error deleting booking:', error);
            alert('An error occurred while deleting the booking.');
        }
    }




    function formatDisplayDate(isoDate) {
        if (!isoDate) return 'N/A';
        const dateObj = new Date(isoDate);
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const dayOfWeek = dayNames[dateObj.getUTCDay()];
        const dayOfMonth = dateObj.getUTCDate();

        const suffix =
            dayOfMonth === 1 || dayOfMonth === 21 || dayOfMonth === 31
                ? "st"
                : dayOfMonth === 2 || dayOfMonth === 22
                ? "nd"
                : dayOfMonth === 3 || dayOfMonth === 23
                ? "rd"
                : "th";

        const month = monthNames[dateObj.getUTCMonth()];
        const year = dateObj.getUTCFullYear();

        return `${dayOfWeek}, ${dayOfMonth}${suffix} ${month} ${year}`;
    }

    fetchBookings(); // Fetch bookings after authentication
});
