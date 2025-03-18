document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                // Redirect to admin page on successful login
                window.location.href = '/index.html';
            } else {
                // Handle invalid credentials
                const errorMessage = await response.text();
                alert(errorMessage);
            }
        } catch (error) {
            console.error('Error logging in:', error);
            alert('An error occurred. Please try again.');
        }
    });
});
