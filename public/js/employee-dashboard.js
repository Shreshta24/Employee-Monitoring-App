// API Base URL - make sure this matches your server
// const API_URL = 'http://localhost:3000/api';

let currentTaskId = null;

// Load dashboard data
async function loadDashboard() {
    console.log('Loading employee dashboard...'); // Debug log
    
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    console.log('Token:', token ? 'Present' : 'Missing'); // Debug log
    console.log('User:', user); // Debug log
    
    if (!token || !user) {
        console.log('No token or user found, redirecting to login');
        window.location.href = '/';
        return;
    }
    
    // Check if user is employee
    if (user.role !== 'employee') {
        console.log('User is not an employee, redirecting');
        window.location.href = '/';
        return;
    }
    
    // Update user info
    document.getElementById('userName').textContent = `Welcome, ${user.name}!`;
    
    try {
        console.log('Fetching dashboard data from:', `${API_URL}/employee/dashboard`);
        
        const response = await fetch(`${API_URL}/employee/dashboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Dashboard response status:', response.status);
        
        if (response.status === 401 || response.status === 403) {
            console.log('Authentication failed, redirecting to login');
            localStorage.clear();
            window.location.href = '/';
            return;
        }
        
        const data = await response.json();
        console.log('Dashboard data received:', data);
        console.log('Tasks received:', data.tasks);
        console.log('Tasks length:', data.tasks ? data.tasks.length : 'undefined');
        console.log('Performance received:', data.performance);
        console.log('Stats received:', data.stats);
        
        if (response.ok) {
            updateDashboard(data);
        } else {
            console.error('Failed to load dashboard:', data.message);
            showError('Failed to load dashboard data');
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        showError('Network error. Please check if server is running.');
    }
}

// Update dashboard with data
function updateDashboard(data) {
    // Update stats
    document.getElementById('totalTasks').textContent = data.stats.totalTasks || 0;
    document.getElementById('completedTasks').textContent = data.stats.completedTasks || 0;
    document.getElementById('inProgressTasks').textContent = data.stats.inProgressTasks || 0;
    document.getElementById('pendingTasks').textContent = data.stats.pendingTasks || 0;
    
    // Update performance
    document.getElementById('tasksAssigned').textContent = data.performance.tasksAssigned || 0;
    document.getElementById('tasksCompleted').textContent = data.performance.tasksCompleted || 0;
    document.getElementById('completionRate').textContent = data.stats.completionRate ? `${data.stats.completionRate}%` : '0%';
    
    const rating = data.performance.rating || '-';
    document.getElementById('performanceRating').textContent = rating;
    
    // Display tasks
    displayTasks(data.tasks);
}

// Display tasks in grid
function displayTasks(tasks) {
    const container = document.getElementById('tasksContainer');
    
    if (!container) {
        console.error('Tasks container not found');
        return;
    }
    
    container.innerHTML = '';
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No tasks assigned yet.</p>';
        return;
    }
    
    tasks.forEach(task => {
        const taskCard = createTaskCard(task);
        container.appendChild(taskCard);
    });
}

// Create task card element
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline';
    const assignedBy = task.assignedBy ? task.assignedBy.name : 'Unknown';
    
    // Format status class
    const statusClass = task.status.replace('-', '');
    
    card.innerHTML = `
        <h4>${escapeHtml(task.title)}</h4>
        <p>${escapeHtml(task.description)}</p>
        <div class="task-meta">
            <span>Assigned by: ${escapeHtml(assignedBy)}</span>
            <span>Due: ${dueDate}</span>
        </div>
        <div class="task-meta" style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span class="task-status status-${statusClass}">${task.status}</span>
            <button onclick="openTaskModal('${task._id}')" class="btn btn-secondary" style="padding: 5px 10px; font-size: 14px;">Update Status</button>
        </div>
    `;
    
    return card;
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Open task status modal
function openTaskModal(taskId) {
    console.log('Opening task modal for task:', taskId);
    currentTaskId = taskId;
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        console.error('Task modal not found');
    }
}

// Close task modal
function closeTaskModal() {
    console.log('Closing task modal');
    currentTaskId = null;
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    const form = document.getElementById('taskStatusForm');
    if (form) {
        form.reset();
    }
}

// Handle task status update
async function updateTaskStatus(event) {
    event.preventDefault();
    
    const status = document.getElementById('taskStatus').value;
    const token = localStorage.getItem('token');
    
    console.log('Updating task status:', { taskId: currentTaskId, status });
    
    if (!currentTaskId || !status) {
        alert('Missing task ID or status');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/tasks/${currentTaskId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        
        const data = await response.json();
        console.log('Update response:', data);
        
        if (response.ok) {
            alert('Task status updated successfully!');
            closeTaskModal();
            loadDashboard(); // Reload dashboard
        } else {
            alert(data.message || 'Failed to update task status');
        }
    } catch (error) {
        console.error('Task update error:', error);
        alert('Failed to update task status. Please try again.');
    }
}

// Show error message on dashboard
function showError(message) {
    const container = document.querySelector('.dashboard-content');
    if (container) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-error';
        errorDiv.textContent = message;
        errorDiv.style.backgroundColor = '#f8d7da';
        errorDiv.style.color = '#721c24';
        errorDiv.style.padding = '15px';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.marginBottom = '20px';
        container.insertBefore(errorDiv, container.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Tab switching and monitoring system
let isMonitoringActive = true; // Re-enabled monitoring
let lastActiveTime = Date.now();
let warningCount = 0;

// Simple tab switching detection without network calls
function checkTabFocus() {
    if (!isMonitoringActive) return;
    
    const currentTime = Date.now();
    const timeAway = currentTime - lastActiveTime;
    
    // If user was away for more than 3 seconds, show warning
    if (timeAway > 3000) {
        console.log('Tab switching detected - user was away for', timeAway, 'ms');
        showTabSwitchWarning();
        warningCount++;
        
        // If too many warnings, notify admin (optional)
        if (warningCount >= 3) {
            console.warn('Multiple tab switches detected - user may not be focused on work');
        }
    }
    
    lastActiveTime = currentTime;
}

// Show tab switching warning
function showTabSwitchWarning() {
    const existingWarning = document.getElementById('tab-warning');
    if (existingWarning) return; // Don't show duplicate warnings
    
    const warningDiv = document.createElement('div');
    warningDiv.id = 'tab-warning';
    warningDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff6b6b;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: Arial, sans-serif;
        font-size: 14px;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
    `;
    warningDiv.innerHTML = `
        <strong>⚠️ Tab Switching Detected!</strong><br>
        Please stay focused on your work tasks.<br>
        <small>Warning ${warningCount + 1} - This activity is being monitored.</small>
    `;
    
    document.body.appendChild(warningDiv);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (warningDiv.parentNode) {
            warningDiv.remove();
        }
    }, 4000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Monitor tab visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Tab became hidden - user may have switched tabs');
        lastActiveTime = Date.now();
    } else {
        console.log('Tab became visible - checking focus');
        setTimeout(checkTabFocus, 1000);
    }
});

// Monitor window focus/blur
window.addEventListener('blur', () => {
    console.log('Window lost focus');
    lastActiveTime = Date.now();
});

window.addEventListener('focus', () => {
    console.log('Window gained focus');
    setTimeout(checkTabFocus, 1000);
});

// Periodic check (every 30 seconds)
setInterval(() => {
    if (document.visibilityState === 'visible') {
        checkTabFocus();
    }
}, 30000);

// Logout function
function logout() {
    localStorage.clear();
    window.location.href = '/';
}

// Make functions available globally
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.updateTaskStatus = updateTaskStatus;
window.logout = logout;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Employee dashboard page loaded');
    
    // Add event listener to task status form
    const taskForm = document.getElementById('taskStatusForm');
    if (taskForm) {
        taskForm.addEventListener('submit', updateTaskStatus);
    } else {
        console.error('Task status form not found');
    }
    
    // Load dashboard data
    loadDashboard();
});