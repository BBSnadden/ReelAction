document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const date = urlParams.get('date');

  // Display the selected date
  const dateDisplay = document.getElementById('date');
  dateDisplay.textContent = formatDisplayDate(date);

  // DOM Elements
  const bookingForm = document.getElementById('bookingForm');
  const stateSelect = document.getElementById('State');
  const charterTypeSelect = document.getElementById('charter_type');
  const numberOfPeopleSelect = document.getElementById('number_of_people'); // Updated to dropdown
  const internationalField = document.createElement('input');
  const charterMessage = document.createElement('p'); // Message for existing charter
  charterMessage.style.color = 'red';
  charterMessage.style.fontSize = '0.9em';
  charterMessage.style.marginTop = '5px';
  charterMessage.style.display = 'none'; // Initially hidden

  // Append message under the charter type dropdown
  charterTypeSelect.parentNode.appendChild(charterMessage);

  // Setup additional input field for country when International is selected
  internationalField.type = 'text';
  internationalField.id = 'InternationalCountry';
  internationalField.name = 'InternationalCountry';
  internationalField.placeholder = 'Enter your country';
  internationalField.style.display = 'none';
  stateSelect.parentNode.appendChild(internationalField);

  // Event listener for state selection
  stateSelect.addEventListener('change', () => {
      if (stateSelect.value === 'International') {
          internationalField.style.display = 'block';
          internationalField.required = true;
      } else {
          internationalField.style.display = 'none';
          internationalField.required = false;
          internationalField.value = ''; // Clear input when not needed
      }
  });

  // Fetch existing charter type and available spots for the selected date
  try {
      const response = await fetch(`/charters/day/${date}`);
      if (!response.ok) {
          throw new Error(`Failed to fetch charter data for ${date}`);
      }

      const data = await response.json();
      console.log("Fetched charter data:", data);

      if (data.charter && data.charter.charter_type) {
          let existingCharterType = data.charter.charter_type.trim();
          existingCharterType = existingCharterType.toLowerCase();

          // Check if the charter type exists in the dropdown
          const optionExists = [...charterTypeSelect.options].some(opt => opt.value.toLowerCase() === existingCharterType);

          if (optionExists) {
              charterTypeSelect.value = existingCharterType;
              charterTypeSelect.disabled = true; // Lock the dropdown
              
              // Show message to customer
              charterMessage.textContent = `A ${existingCharterType} charter already exists for this date. You can only book this type.`;
              charterMessage.style.display = 'block';
          } else {
              console.warn(`Charter type '${existingCharterType}' not found in dropdown options.`);
          }

          // Remove the "Select Charter Type" option
          const defaultOption = charterTypeSelect.querySelector('option[value=""]');
          if (defaultOption) {
              defaultOption.remove();
          }
      }

      // **Set the number of available spots dynamically**
      if (data.charter && data.bookings) {
          const boatCapacity = data.charter.boat_capacity || 12; // Default to 12 if not set
          const totalBooked = data.bookings.reduce((sum, booking) => sum + booking.number_of_people, 0);
          const availableSpots = Math.max(boatCapacity - totalBooked, 0);

          console.log(`Boat capacity: ${boatCapacity}, Booked: ${totalBooked}, Available spots: ${availableSpots}`);

          if (availableSpots > 0) {
              populateNumberOfPeopleDropdown(availableSpots);
          } else {
              numberOfPeopleSelect.innerHTML = "<option value='0'>Fully Booked</option>";
              numberOfPeopleSelect.disabled = true;
          }
      }

  } catch (error) {
      console.error('Error fetching existing charter type or available spots:', error);
  }

  function populateNumberOfPeopleDropdown(spotsLeft) {
      numberOfPeopleSelect.innerHTML = ""; // Clear previous options

      for (let i = 1; i <= spotsLeft; i++) {
          const option = document.createElement('option');
          option.value = i;
          option.textContent = i;
          numberOfPeopleSelect.appendChild(option);
      }
  }

  bookingForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      let stateValue = stateSelect.value;
      if (stateValue === 'International') {
          stateValue = internationalField.value.trim();
          if (!stateValue) {
              alert("Please enter your country.");
              return;
          }
      }

      // Collect form data
      const formData = {
          full_name: document.getElementById('FullName').value,
          phone_number: document.getElementById('PhoneNumber').value,
          email: document.getElementById('Email').value,
          state: stateValue,
          date: date,
          number_of_people: numberOfPeopleSelect.value,
          charter_type: charterTypeSelect.value,
          heard_about_us: document.getElementById('heard_about_us_customer').value || null,
      };

      try {
          // Send the data to the backend
          const response = await fetch('/charters/customer-booking', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
          });

          if (response.ok) {
              alert('Booking submitted successfully!');
              window.location.href = '/successfulBooking';
          } else {
              alert('Failed to submit booking. Please try again.');
          }
      } catch (error) {
          console.error('Error submitting booking:', error);
          alert('An unexpected error occurred.');
      }
  });

  // Format date for display
  function formatDisplayDate(isoDate) {
      const dateObj = new Date(isoDate);
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
      ];

      const dayOfWeek = dayNames[dateObj.getUTCDay()];
      const dayOfMonth = dateObj.getUTCDate();
      const suffix =
          dayOfMonth === 1 || dayOfMonth === 21 || dayOfMonth === 31 ? "st" :
          dayOfMonth === 2 || dayOfMonth === 22 ? "nd" :
          dayOfMonth === 3 || dayOfMonth === 23 ? "rd" : "th";

      const month = monthNames[dateObj.getUTCMonth()];
      const year = dateObj.getUTCFullYear();

      return `${dayOfWeek}, ${dayOfMonth}${suffix} ${month} ${year}`;
  }
});
