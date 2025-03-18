// window.addEventListener('scroll', function() {
//     var navbar = document.querySelector('.navbar');
//     if (window.scrollY > 50) {
//       navbar.classList.add('shrink');
//     } else {
//       navbar.classList.remove('shrink');
//     }

    
// });

document.addEventListener('DOMContentLoaded', function() {
  const loginButton = document.getElementById('loginButton');

  loginButton.addEventListener('click', function() {
      window.location.href = 'login.html';
  });
  // Function to check authentication status and update button
  async function checkAuthStatus() {
      try {
          const response = await fetch('/auth-status');
          const data = await response.json();

          if (data.isAuthenticated) {
              loginButton.textContent = 'Logout';
              loginButton.classList.remove('btn-login');
              loginButton.classList.add('btn-logout');
              loginButton.addEventListener('click', function() {
                  window.location.href = '/logout';
              });
          } else {
              loginButton.textContent = 'Login';
              loginButton.classList.remove('btn-logout');
              loginButton.classList.add('btn-login');
              loginButton.addEventListener('click', function() {
                  window.location.href = '/login.html';
              });
          }
      } catch (error) {
          console.error('Error checking authentication status:', error);
      }
  }

  // Check authentication status on page load
  checkAuthStatus();
});
