document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const formResponse = document.getElementById('formResponse');

    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            message: document.getElementById('message').value.trim(),
        };

        // ✅ Basic validation
        if (!formData.name || !formData.email || !formData.phone) {
            formResponse.innerText = "Please fill in all required fields.";
            formResponse.style.color = "red";
            formResponse.style.display = "block";
            return;
        }

        try {
            const response = await fetch('/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            formResponse.innerText = result.message;
            formResponse.style.color = response.ok ? "green" : "red";
            formResponse.style.display = "block";

            if (response.ok) {
                contactForm.reset();
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            formResponse.innerText = "Something went wrong. Please try again later.";
            formResponse.style.color = "red";
            formResponse.style.display = "block";
        }
    });
});
