// API Base URL
const API_URL = 'http://localhost:3000/api';

console.log('EMPLOYER DASHBOARD JS LOADED - VERSION 2.0');

// Load dashboard data
async function loadDashboard() {
    console.log('Loading employer dashboard...');
    
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
        console.log('No token or user found, redirecting');
        window.location.href = '/';
        return;
    }
    
    if (user.role !== 'employer') {
        console.log('User is not an employer, redirecting');
        window.location.href = '/';
        return;
    }
    
    document.getElementById('userName').textContent = `Welcome, ${user.name}!`;
    
    try {
        console.log('Fetching from:', `${API_URL}/employer/dashboard`);
        
        const response = await fetch(`${API_URL}/employer/dashboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Response status:', response.status);
        
        if (response.status === 401 || response.status === 403) {
            localStorage.clear();
            window.location.href = '/';
            return;
        }
        
        const data = await response.json();
        console.log('Dashboard data received:', data);
        console.log('Data type:', typeof data);
        console.log('Data keys:', Object.keys(data));
        console.log('Employees property:', data.employees);
        console.log('Employees type:', typeof data.employees);
        console.log('Employees length:', data.employees ? data.employees.length : 'undefined');
        
        if (response.ok) {
            updateDashboard(data);
        } else {
            alert(data.message || 'Failed to load dashboard');
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        alert('Network error. Please check if server is running.');
    }
}

// Update dashboard
function updateDashboard(data) {
    console.log('Updating dashboard...');
    console.log('Full dashboard data:', data);
    console.log('Employees received:', data.employees);
    console.log('Type of employees:', typeof data.employees);
    console.log('Employees length:', data.employees ? data.employees.length : 'undefined');
    
    // Update stats
    document.getElementById('totalEmployees').textContent = data.stats.totalEmployees || 0;
    document.getElementById('totalTasks').textContent = data.stats.totalTasks || 0;
    document.getElementById('completedTasks').textContent = data.stats.completedTasks || 0;
    document.getElementById('pendingTasks').textContent = data.stats.pendingTasks || 0;
    
    // Populate dropdown
    populateEmployeeSelect(data.employees);
    
    // Display employees
    displayEmployees(data.employees);
    
    // Display tasks
    displayTasks(data.tasks);
}

// Populate employee select
function populateEmployeeSelect(employees) {
    console.log('Populating employee select with:', employees);
    
    const select = document.getElementById('taskEmployee');
    if (!select) {
        console.error('Employee select not found!');
        return;
    }
    
    // Clear dropdown
    select.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select an Employee --';
    defaultOption.selected = true;
    select.appendChild(defaultOption);
    
    // Check if employees exist
    if (!employees || employees.length === 0) {
        console.log('No employees found');
        const noOption = document.createElement('option');
        noOption.value = '';
        noOption.textContent = 'No employees registered';
        noOption.disabled = true;
        select.appendChild(noOption);
        return;
    }
    
    // Add employees
    for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        console.log(`Adding: ${emp.name} (${emp._id})`);
        
        const option = document.createElement('option');
        option.value = emp._id;
        option.textContent = `${emp.name} - ${emp.email}`;
        select.appendChild(option);
    }
    
    console.log(`Added ${employees.length} employees to dropdown`);
}

// Display employees
function displayEmployees(employees) {
    const container = document.getElementById('employeesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!employees || employees.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">No employees registered yet.</p>';
        return;
    }
    
    for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        const card = document.createElement('div');
        card.className = 'employee-card';
        card.innerHTML = `
            <h4>${emp.name}</h4>
            <p>Email: ${emp.email}</p>
            <p>Department: ${emp.department || 'Not specified'}</p>
            <p>ID: ${emp._id}</p>
        `;
        container.appendChild(card);
    }
}

// Display tasks
function displayTasks(tasks) {
    const container = document.getElementById('tasksContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">No tasks assigned yet.</p>';
        return;
    }
    
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const card = document.createElement('div');
        card.className = 'task-card';
        
        const assignedTo = task.assignedTo ? task.assignedTo.name : 'Unknown';
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline';
        
        card.innerHTML = `
            <h4>${task.title}</h4>
            <p>${task.description}</p>
            <div class="task-meta">
                <span>Assigned to: ${assignedTo}</span>
                <span>Due: ${dueDate}</span>
            </div>
            <div class="task-status status-${task.status}">${task.status}</div>
        `;
        container.appendChild(card);
    }
}

// Logout function
function logout() {
    localStorage.clear();
    window.location.href = '/';
}

// Test function
function testEmployeeSelect() {
    const select = document.getElementById('taskEmployee');
    if (select) {
        console.log('Employee select found with', select.options.length, 'options');
        for (let i = 0; i <select.options.length; i++) {
            console.log(`Option ${i}:`, select.options[i].text);
        }
    } else {
        console.error('Employee select NOT found');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded');
        
    // Test direct API call without auth first
    testDirectAPI();
        
    // Set up task assignment form listener
    const assignTaskForm = document.getElementById('assignTaskForm');
    if (assignTaskForm) {
        assignTaskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
                
            const title = document.getElementById('taskTitle').value;
            const description = document.getElementById('taskDescription').value;
            const assignedTo = document.getElementById('taskEmployee').value;
            const dueDate = document.getElementById('taskDueDate').value;
            const token = localStorage.getItem('token');
                
            console.log('Assigning task:', { title, description, assignedTo, dueDate });
                
            if (!title || !description || !assignedTo || !dueDate) {
                alert('Please fill in all fields');
                return;
            }
                
            try {
                const response = await fetch(`${API_URL}/tasks/assign`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, description, assignedTo, dueDate })
                });
                    
                const data = await response.json();
                console.log('Assignment response:', data);
                    
                if (response.ok) {
                    alert('Task assigned successfully!');
                    document.getElementById('assignTaskForm').reset();
                    loadDashboard();
                } else {
                    alert(data.message || 'Failed to assign task');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to assign task');
            }
        });
    } else {
        console.error('Assign task form not found!');
    }
        
    loadDashboard();
    setTimeout(testEmployeeSelect, 3000);
});

// Test function to check direct API access
async function testDirectAPI() {
    try {
        console.log('Testing direct API access...');
        const response = await fetch(`${API_URL}/test/employer-dashboard`);
        const data = await response.json();
        console.log('Direct API test result:', data);
        console.log('Direct API employees:', data.employees);
            
        // Try to populate with this data
        if (data.employees && data.employees.length > 0) {
            console.log('Testing population with direct API data...');
            populateEmployeeSelect(data.employees);
            displayEmployees(data.employees);
        }
    } catch (error) {
        console.error('Direct API test failed:', error);
    }
}