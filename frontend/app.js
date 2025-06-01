// DHL SOF Warehouse Scheduler - Frontend JavaScript

const API_BASE = 'https://dhl-sofia.onrender.com/api';

// Global state
let currentView = 'dashboard';
let events = [];
let isAdminAuthenticated = false;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('🚛 DHL Warehouse Scheduler - Initializing...');
    
    // Set up navigation
    setupNavigation();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize form with today's date minimum
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('eventDate').setAttribute('min', today);
    
    // Start time updates
    updateTime();
    setInterval(updateTime, 1000); // Update every second for real-time display
    
    // Load initial data
    loadEvents();
    
    // Auto-refresh dashboard every 30 seconds
    setInterval(() => {
        if (currentView === 'dashboard') {
            loadEvents();
        }
    }, 30000);
    
    console.log('✓ App initialized successfully');
}

// Navigation
function setupNavigation() {
    document.getElementById('dashboardBtn').addEventListener('click', () => showView('dashboard'));
    document.getElementById('formBtn').addEventListener('click', () => showView('eventForm'));
    document.getElementById('adminBtn').addEventListener('click', () => showView('adminPanel'));
}

function showView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected view
    document.getElementById(viewName).classList.add('active');
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (viewName === 'dashboard') {
        document.getElementById('dashboardBtn').classList.add('active');
        loadEvents();
    } else if (viewName === 'eventForm') {
        document.getElementById('formBtn').classList.add('active');
        resetForm();
    } else if (viewName === 'adminPanel') {
        document.getElementById('adminBtn').classList.add('active');
        if (!isAdminAuthenticated) {
            showAdminLogin();
        } else {
            showAdminContent();
        }
    }
    
    currentView = viewName;
}

// Time updates
function updateTime() {
    const now = new Date();
    
    const timeString = now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const dateString = now.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    document.getElementById('currentTime').textContent = timeString;
    document.getElementById('currentDate').textContent = dateString;
}

// Event management
async function loadEvents() {
    try {
        const response = await fetch(`${API_BASE}/events?filter=upcoming`);
        if (!response.ok) throw new Error('Failed to load events');
        
        events = await response.json();
        updateDashboard();
        
        if (currentView === 'adminPanel' && isAdminAuthenticated) {
            loadAdminEvents();
        }
        
    } catch (error) {
        console.error('Error loading events:', error);
        showError('Failed to load events. Please check your connection.');
    }
}

function updateDashboard() {
    // Update stats
    const today = new Date().toDateString();
    const todayEvents = events.filter(event => {
        const eventDate = new Date(event.date_time).toDateString();
        return eventDate === today;
    });
    
    document.getElementById('todayEvents').textContent = todayEvents.length;
    document.getElementById('upcomingEvents').textContent = events.length;
    document.getElementById('completedEvents').textContent = '0'; // TODO: Load completed events
    
    // Update events list - Sort by soonest first (ascending date_time)
    const eventsList = document.getElementById('eventsList');
    
    if (events.length === 0) {
        eventsList.innerHTML = `
            <div class="no-events">
                <i class="fas fa-box"></i>
                <div>No upcoming events scheduled</div>
            </div>
        `;
        return;
    }
    
    // Sort events by date_time ascending (soonest first)
    const sortedEvents = [...events].sort((a, b) => {
        return new Date(a.date_time) - new Date(b.date_time);
    });
    
    eventsList.innerHTML = sortedEvents.map(event => {
        const eventDate = new Date(event.date_time);
        const timeString = eventDate.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const dateString = eventDate.toLocaleDateString('en-GB');
        const endTime = new Date(eventDate.getTime() + event.duration * 60000);
        const endTimeString = endTime.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        const loadTypeClass = event.load_type ? event.load_type.toLowerCase() : '';
        
        return `
            <div class="event-card ${loadTypeClass}">
                <div class="event-content">
                    <div class="event-time">
                        <div class="time">${timeString}</div>
                        <div class="duration">- ${endTimeString}</div>
                        <div class="date">${dateString}</div>
                    </div>
                    
                    <div class="event-info">
                        <h3>${event.type}</h3>
                        ${event.truck_plate ? `<div class="truck-plate">🚛 ${event.truck_plate}</div>` : ''}
                    </div>
                    
                    <div class="event-details">
                        ${event.purpose ? `<div class="purpose">${event.purpose}</div>` : ''}
                        ${event.load_type ? `<div class="load-type-badge ${event.load_type.toLowerCase()}">${event.load_type}</div>` : ''}
                    </div>
                    
                    <div class="event-meta">
                        <div class="creator">Created by:</div>
                        <div class="email">${event.created_by}</div>
                        ${event.notes ? `<div class="notes">📝 ${event.notes}</div>` : ''}
                    </div>
                    
                    <div class="event-duration">
                        <div class="duration-number">${event.duration}</div>
                        <div class="duration-label">minutes</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Event form
function setupEventListeners() {
    // Event type change
    document.getElementById('eventType').addEventListener('change', function() {
        const truckFields = document.getElementById('truckFields');
        if (this.value === 'Truck Arrival') {
            truckFields.style.display = 'block';
            truckFields.classList.add('active');
        } else {
            truckFields.style.display = 'none';
            truckFields.classList.remove('active');
        }
    });
    
    // Form buttons
    document.getElementById('createEventBtn').addEventListener('click', createEvent);
    document.getElementById('cancelBtn').addEventListener('click', () => showView('dashboard'));
    
    // Admin login
    document.getElementById('loginBtn').addEventListener('click', adminLogin);
    document.getElementById('backToDashboardBtn').addEventListener('click', () => showView('dashboard'));
    document.getElementById('logoutBtn').addEventListener('click', adminLogout);
    
    // Admin actions
    document.getElementById('exportBtn').addEventListener('click', exportCSV);
    document.getElementById('refreshBtn').addEventListener('click', loadAdminEvents);
    document.getElementById('eventFilter').addEventListener('change', loadAdminEvents);
    
    // Allow Enter key for admin login
    document.getElementById('adminPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            adminLogin();
        }
    });
}

async function createEvent() {
    const eventData = {
        type: document.getElementById('eventType').value,
        truck_plate: document.getElementById('truckPlate').value || null,
        purpose: document.getElementById('purpose').value || null,
        load_type: document.getElementById('loadType').value || null,
        date_time: `${document.getElementById('eventDate').value}T${document.getElementById('eventTime').value}:00`,
        created_by: document.getElementById('createdBy').value,
        notes: document.getElementById('notes').value || null
    };
    
    // Validation
    if (!eventData.type || !eventData.date_time || !eventData.created_by) {
        showError('Please fill in all required fields');
        return;
    }
    
    if (eventData.type === 'Truck Arrival' && (!eventData.truck_plate || !eventData.purpose || !eventData.load_type)) {
        showError('Please fill in all truck arrival details');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create event');
        }
        
        showSuccess('Event created successfully!');
        resetForm();
        showView('dashboard');
        loadEvents();
        
    } catch (error) {
        console.error('Error creating event:', error);
        showError(error.message);
    }
}

function resetForm() {
    document.getElementById('eventType').value = '';
    document.getElementById('truckPlate').value = '';
    document.getElementById('purpose').value = '';
    document.getElementById('loadType').value = '';
    document.getElementById('eventDate').value = '';
    document.getElementById('eventTime').value = '';
    document.getElementById('createdBy').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('truckFields').style.display = 'none';
    document.getElementById('truckFields').classList.remove('active');
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('eventDate').setAttribute('min', today);
}

// Admin panel
async function adminLogin() {
    const password = document.getElementById('adminPassword').value;
    
    if (!password) {
        showError('Please enter password');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: password
            })
        });
        
        if (!response.ok) {
            throw new Error('Invalid password');
        }
        
        isAdminAuthenticated = true;
        document.getElementById('adminPassword').value = '';
        showAdminContent();
        loadAdminEvents();
        
    } catch (error) {
        console.error('Login error:', error);
        showError('Invalid password');
    }
}

function adminLogout() {
    isAdminAuthenticated = false;
    showView('dashboard');
}

function showAdminLogin() {
    document.getElementById('adminLogin').style.display = 'flex';
    document.getElementById('adminContent').style.display = 'none';
}

function showAdminContent() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
}

async function loadAdminEvents() {
    if (!isAdminAuthenticated) return;
    
    const filter = document.getElementById('eventFilter').value;
    
    try {
        const response = await fetch(`${API_BASE}/events?filter=${filter}`);
        if (!response.ok) throw new Error('Failed to load events');
        
        const allEvents = await response.json();
        displayAdminEvents(allEvents);
        
    } catch (error) {
        console.error('Error loading admin events:', error);
        showError('Failed to load events');
    }
}

function displayAdminEvents(events) {
    const tbody = document.getElementById('adminEventsBody');
    
    if (events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No events found</td></tr>';
        return;
    }
    
    tbody.innerHTML = events.map(event => {
        const eventDate = new Date(event.date_time);
        const dateString = eventDate.toLocaleDateString('en-GB');
        const timeString = eventDate.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        let statusClass = 'status-pending';
        let statusText = 'PENDING';
        
        if (event.deleted) {
            statusClass = 'status-deleted';
            statusText = 'DELETED';
        } else if (event.completed) {
            statusClass = 'status-completed';
            statusText = 'COMPLETED';
        }
        
        const actions = [];
        if (!event.completed && !event.deleted) {
            actions.push(`<button class="btn btn-success" onclick="markCompleted(${event.id})"><i class="fas fa-check"></i> Complete</button>`);
        }
        if (!event.deleted) {
            actions.push(`<button class="btn btn-danger" onclick="deleteEvent(${event.id})"><i class="fas fa-trash"></i> Delete</button>`);
        }
        
        return `
            <tr ${event.deleted ? 'class="deleted"' : ''}>
                <td>
                    <div>${dateString}</div>
                    <div style="font-weight: bold;">${timeString}</div>
                </td>
                <td>
                    <div>${event.type}</div>
                    ${event.load_type ? `<span class="load-type-badge ${event.load_type.toLowerCase()}">${event.load_type}</span>` : ''}
                </td>
                <td>
                    ${event.truck_plate ? `<div>🚛 ${event.truck_plate}</div>` : ''}
                    ${event.purpose ? `<div>${event.purpose}</div>` : ''}
                    ${event.notes ? `<div style="font-size: 0.875rem; color: #6B7280;">📝 ${event.notes}</div>` : ''}
                </td>
                <td style="font-size: 0.875rem;">${event.created_by}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        ${actions.join('')}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function markCompleted(eventId) {
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ completed: true })
        });
        
        if (!response.ok) throw new Error('Failed to update event');
        
        showSuccess('Event marked as completed');
        loadAdminEvents();
        loadEvents();
        
    } catch (error) {
        console.error('Error updating event:', error);
        showError('Failed to update event');
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete event');
        
        showSuccess('Event deleted successfully');
        loadAdminEvents();
        loadEvents();
        
    } catch (error) {
        console.error('Error deleting event:', error);
        showError('Failed to delete event');
    }
}

function exportCSV() {
    window.open(`${API_BASE}/events/export/csv`, '_blank');
}

// Utility functions
function showSuccess(message) {
    alert(`✅ ${message}`);
}

function showError(message) {
    alert(`❌ ${message}`);
}

// Make functions global for onclick handlers
window.markCompleted = markCompleted;
window.deleteEvent = deleteEvent;

console.log('🚛 DHL Warehouse Scheduler - JavaScript loaded');
