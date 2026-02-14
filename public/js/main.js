// API Base URL - make sure this matches your server
const API_URL = 'http://localhost:3000/api';

// Toggle between login and register forms
function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

// Toggle employer fields based on role selection
function toggleEmployerFields() {
    const role = document.getElementById('register-role').value;
    const employerFields = document.querySelectorAll('.employer-field');
    
    if (role === 'employer') {
        employerFields.forEach(field => field.classList.remove('hidden'));
    } else {
        employerFields.forEach(field => field.classList.add('hidden'));
    }
}

// Show alert message
function showAlert(message, type, container) {
    // Remove any existing alerts
    const existingAlerts = container.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.marginBottom = '15px';
    alertDiv.style.padding = '10px';
    alertDiv.style.borderRadius = '5px';
    
    if (type === 'success') {
        alertDiv.style.backgroundColor = '#d4edda';
        alertDiv.style.color = '#155724';
        alertDiv.style.border = '1px solid #c3e6cb';
    } else {
        alertDiv.style.backgroundColor = '#f8d7da';
        alertDiv.style.color = '#721c24';
        alertDiv.style.border = '1px solid #f5c6cb';
    }
    
    // Insert at the top of the form
    const form = container.querySelector('form');
    form.parentNode.insertBefore(alertDiv, form);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Handle Registration
document.getElementById('register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    console.log('Registration form submitted'); // Debug log
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    const department = document.getElementById('register-department').value;
    const position = document.getElementById('register-position').value;
    
    console.log('Form data:', { name, email, password, role, department, position }); // Debug log
    
    if (!name || !email || !password || !role) {
        showAlert('Please fill in all required fields', 'error', document.querySelector('#register-form'));
        return;
    }
    
    const userData = {
        name,
        email,
        password,
        role
    };
    
    // Add optional fields for employer
    if (role === 'employer') {
        if (department) userData.department = department;
        if (position) userData.position = position;
    }
    
    try {
        console.log('Sending request to:', `${API_URL}/register`); // Debug log
        console.log('Request data:', userData); // Debug log
        
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        console.log('Response status:', response.status); // Debug log
        
        const data = await response.json();
        console.log('Response data:', data); // Debug log
        
        if (response.ok) {
            showAlert('Registration successful! Please login.', 'success', document.querySelector('#register-form'));
            // Clear form
            document.getElementById('register').reset();
            // Switch to login form after 2 seconds
            setTimeout(() => {
                showLogin();
            }, 2000);
        } else {
            showAlert(data.message || 'Registration failed', 'error', document.querySelector('#register-form'));
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('Network error. Please check if server is running.', 'error', document.querySelector('#register-form'));
    }
});

// Handle Login
document.getElementById('login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    console.log('Login form submitted'); // Debug log
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const role = document.getElementById('login-role').value;
    
    if (!email || !password || !role) {
        showAlert('Please fill in all fields', 'error', document.querySelector('#login-form'));
        return;
    }
    
    try {
        console.log('Sending login request to:', `${API_URL}/login`); // Debug log
        
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, role })
        });
        
        console.log('Login response status:', response.status); // Debug log
        
        const data = await response.json();
        console.log('Login response data:', data); // Debug log
        
        if (response.ok) {
            // Store user data in localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showAlert('Login successful! Redirecting...', 'success', document.querySelector('#login-form'));
            
            // Redirect based on role
            setTimeout(() => {
                if (data.user.role === 'employee') {
                    window.location.href = '/dashboard/employee';
                } else {
                    window.location.href = '/dashboard/employer';
                }
            }, 1500);
        } else {
            showAlert(data.message || 'Login failed', 'error', document.querySelector('#login-form'));
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Network error. Please check if server is running.', 'error', document.querySelector('#login-form'));
    }
});

// Make functions available globally
window.showRegister = showRegister;
window.showLogin = showLogin;
window.toggleEmployerFields = toggleEmployerFields;