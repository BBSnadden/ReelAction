document.addEventListener("DOMContentLoaded", () => {
    const scrollingImages = document.querySelector('.scrolling-images');
    const leftArrow = document.querySelector('.arrow-left');
    const rightArrow = document.querySelector('.arrow-right');

    if (!scrollingImages) return;

    let imageWidth = calculateImageWidth(); // Dynamically calculate image width
    const baseSpeed = 0.2; // Base speed of automatic scrolling
    let scrollPosition = 0;
    let isPaused = false; // Flag to pause auto-scrolling
    let manualScrollVelocity = 0; // Current velocity for manual scrolling
    let manualScrollDistance = 0; // Remaining distance for manual scrolling
    let pauseTimeout; // Timeout to resume auto-scrolling

    // Dynamically calculate image width
    function calculateImageWidth() {
        const firstImage = scrollingImages.children[0];
        if (!firstImage) return 0;

        const width = firstImage.offsetWidth;
        const margin = parseInt(getComputedStyle(firstImage).marginRight, 10) || 0;
        return width + margin;
    }

    // Update imageWidth on window resize
    window.addEventListener('resize', () => {
        imageWidth = calculateImageWidth();
    });

    // Fill container with duplicated images for seamless scrolling
    function fillContainer() {
        const images = Array.from(scrollingImages.children);
        if (images.length === 0) return;

        let totalWidth = scrollingImages.scrollWidth;

        while (totalWidth < window.innerWidth * 2) {
            images.forEach((image) => {
                const clone = image.cloneNode(true);
                scrollingImages.appendChild(clone);
            });

            scrollingImages.scrollWidth; // Force reflow to ensure the new width is calculated
            totalWidth = scrollingImages.scrollWidth;
        }
    }

    // Initial container fill
    fillContainer();

    // Pause scrolling for 5 seconds
    function pauseScrolling() {
        isPaused = true;
        clearTimeout(pauseTimeout); // Clear any previous timeout
        pauseTimeout = setTimeout(() => {
            isPaused = false;
        }, 5000);
    }

    // Handle manual scrolling acceleration
    function accelerateScroll(direction) {
        pauseScrolling(); // Pause auto-scrolling

        if (manualScrollDistance === 0) {
            manualScrollVelocity = 30 * direction; // Adjusted velocity for smoother scrolling
            manualScrollDistance = imageWidth * 15; // Adjusted skip distance for larger moves
        }
    }

    // Automatic scrolling and manual adjustments
    function scroll() {
        try {
            if (manualScrollDistance > 0) {
                // If manual scroll is active, handle it
                scrollPosition += manualScrollVelocity; // Apply manual velocity
                manualScrollDistance -= Math.abs(manualScrollVelocity); // Decrease remaining distance

                // Gradually slow down the manual scroll
                manualScrollVelocity *= 0.9;

                // Clamp values to prevent infinite scrolling due to floating-point errors
                if (manualScrollDistance < 1e-3 || Math.abs(manualScrollVelocity) < 1e-3) {
                    manualScrollDistance = 0;
                    manualScrollVelocity = 0;
                }
            } else if (!isPaused) {
                // Default automatic scrolling when not paused
                scrollPosition -= baseSpeed;
            }

            // Reset scroll position for seamless looping
            if (scrollPosition <= -scrollingImages.scrollWidth / 2) {
                scrollPosition = 0;
            } else if (scrollPosition >= 0) {
                scrollPosition = -scrollingImages.scrollWidth / 2;
            }

            // Apply the transform to the scrolling images
            scrollingImages.style.transform = `translateX(${scrollPosition}px)`;

            requestAnimationFrame(scroll);
        } catch (error) {
            console.error("Error in scroll function:", error);
        }
    }

    // Event listeners for arrow buttons
    if (leftArrow) {
        leftArrow.addEventListener('click', () => accelerateScroll(1)); // Left arrow moves right
    }

    if (rightArrow) {
        rightArrow.addEventListener('click', () => accelerateScroll(-1)); // Right arrow moves left
    }

    // Start the scrolling animation
    scroll();
});

document.addEventListener('DOMContentLoaded', function () {
    async function fetchUpcomingCharters() {
        try {
            const response = await fetch('/charters/bookings/upcoming');

            // Log raw response to check for errors
            const textResponse = await response.text();
            console.log('Raw Response:', textResponse);

            let charters = JSON.parse(textResponse);  // Use 'let' instead of 'const'

            // If fewer than 6 tentative charters, fill the remaining slots with "Available"
            if (charters.length < 6) {
                const extraAvailableDays = findAvailableDays(charters.length, 6);
                charters = [...charters, ...extraAvailableDays];  // Now valid with 'let'
            }

            displayUpcomingCharters(charters);
        } catch (error) {
            console.error('Error fetching upcoming charters:', error);
        }
    }



    function findAvailableDays(currentCount, totalNeeded) {
        const availableDays = [];
        const today = new Date();
        let searchDate = new Date(today);
        let neededSlots = totalNeeded - currentCount;

        while (availableDays.length < neededSlots) {
            searchDate.setDate(searchDate.getDate() + 1);
            const formattedDate = searchDate.toISOString().split('T')[0];

            availableDays.push({
                date: formattedDate,
                charter_type: 'Available',
                spots_left: '-'
            });
        }

        return availableDays;
    }

    function displayUpcomingCharters(charters) {
        const facebookFeed = document.querySelector('.facebook-feed');
        facebookFeed.innerHTML = ''; // Clear existing content

        if (charters.length === 0) {
            facebookFeed.innerHTML = `<p>No upcoming tentative trips with available spots. Check back later!</p>`;
            return;
        }

        charters.forEach(charter => {
            const charterDiv = document.createElement('div');
            charterDiv.classList.add('charter-item');

            // Determine charter type and availability
            const isAvailablePlaceholder = charter.charter_type === 'Available';
            const displayType = isAvailablePlaceholder ? "Available" : charter.charter_type;
            const displaySpots = isAvailablePlaceholder ? "8" : `${charter.spots_left} spots left`;

            // Apply styling classes
            if (isAvailablePlaceholder) {
                charterDiv.classList.add('available'); // Green
            } else {
                charterDiv.classList.add('tentative'); // Yellow
            }

            charterDiv.innerHTML = `
                <div class="charter-date">
                    <strong>${formatDate(new Date(charter.date))}</strong>
                </div>
                <div class="charter-details">
                    <p><strong>Charter Type:</strong> ${displayType}</p>
                    <p><strong>Spots Left:</strong> ${displaySpots}</p>
                </div>
            `;
            facebookFeed.appendChild(charterDiv);
        });
    }




    function formatDate(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Fetch and display upcoming charters on page load
    fetchUpcomingCharters();
});
