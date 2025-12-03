```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Login credentials
    const ADMIN_CREDENTIALS = {
        username: 'admin',
        password: 'appayon123'
    };
    
    // DOM Elements
    const loginSection = document.getElementById('login-section');
    const adminDashboard = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Check if user is already logged in
    checkAuthStatus();
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Check authentication status
    function checkAuthStatus() {
        const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
        
        if (isLoggedIn) {
            showDashboard();
            loadBookings();
            setupFilters();
        } else {
            showLogin();
        }
    }
    
    // Handle login
    function handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            // Successful login
            sessionStorage.setItem('admin_logged_in', 'true');
            showDashboard();
            loadBookings();
            setupFilters();
        } else {
            // Failed login
            alert('Invalid username or password. Try: admin / appayon123');
        }
    }
    
    // Handle logout
    function handleLogout() {
        sessionStorage.removeItem('admin_logged_in');
        showLogin();
        // Clear any filters
        clearFilters();
    }
    
    // Show login screen
    function showLogin() {
        if (loginSection) loginSection.style.display = 'flex';
        if (adminDashboard) adminDashboard.style.display = 'none';
        if (loginForm) loginForm.reset();
    }
    
    // Show dashboard
    function showDashboard() {
        if (loginSection) loginSection.style.display = 'none';
        if (adminDashboard) adminDashboard.style.display = 'block';
    }
    
    // Setup filters
    function setupFilters() {
        const filterDate = document.getElementById('filter-date');
        const filterStatus = document.getElementById('filter-status');
        const searchInput = document.getElementById('search');
        const resetFiltersBtn = document.getElementById('reset-filters');
        
        // Set default date to today
        if (filterDate) {
            const today = new Date().toISOString().split('T')[0];
            filterDate.value = today;
        }
        
        // Add event listeners
        if (filterDate) {
            filterDate.addEventListener('change', loadBookings);
        }
        
        if (filterStatus) {
            filterStatus.addEventListener('change', loadBookings);
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', debounce(loadBookings, 300));
        }
        
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', clearFilters);
        }
    }
    
    // Clear filters
    function clearFilters() {
        const filterDate = document.getElementById('filter-date');
        const filterStatus = document.getElementById('filter-status');
        const searchInput = document.getElementById('search');
        
        if (filterDate) filterDate.value = '';
        if (filterStatus) filterStatus.value = 'all';
        if (searchInput) searchInput.value = '';
        
        loadBookings();
    }
    
    // Debounce function for search
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Load bookings
    async function loadBookings() {
        const tbody = document.getElementById('bookings-tbody');
        if (!tbody) return;
        
        // Show loading
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading bookings...</p>
                </td>
            </tr>
        `;
        
        try {
            // Get filter values
            const filterDate = document.getElementById('filter-date')?.value || '';
            const filterStatus = document.getElementById('filter-status')?.value || 'all';
            const searchQuery = document.getElementById('search')?.value || '';
            
            // Build query string
            let queryString = '';
            if (filterDate) queryString += `date=${filterDate}&`;
            if (filterStatus && filterStatus !== 'all') queryString += `status=${filterStatus}&`;
            
            // Fetch bookings
            const response = await fetch(`/api/bookings?${queryString}`);
            let bookings = await response.json();
            
            // Apply search filter client-side
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                bookings = bookings.filter(booking => 
                    booking.name.toLowerCase().includes(searchLower) ||
                    booking.phone.includes(searchQuery)
                );
            }
            
            // Update stats
            updateStats(bookings);
            
            // Render bookings
            renderBookings(bookings);
        } catch (error) {
            console.error('Error loading bookings:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading bookings. Please try again.</p>
                    </td>
                </tr>
            `;
        }
    }
    
    // Update statistics
    function updateStats(bookings) {
        const today = new Date().toISOString().split('T')[0];
        
        // Calculate stats
        const totalToday = bookings.filter(b => b.date === today).length;
        const totalPending = bookings.filter(b => b.status === 'pending').length;
        const totalConfirmed = bookings.filter(b => b.status === 'confirmed').length;
        const totalCancelled = bookings.filter(b => b.status === 'cancelled').length;
        
        // Update DOM
        document.getElementById('total-today').textContent = totalToday;
        document.getElementById('total-pending').textContent = totalPending;
        document.getElementById('total-confirmed').textContent = totalConfirmed;
        document.getElementById('total-cancelled').textContent = totalCancelled;
    }
    
    // Render bookings table
    function renderBookings(bookings) {
        const tbody = document.getElementById('bookings-tbody');
        
        if (bookings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-calendar-times"></i>
                        <p>No bookings found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = bookings.map(booking => `
            <tr data-booking-id="${booking.id}">
                <td>${escapeHtml(booking.name)}</td>
                <td>${escapeHtml(booking.phone)}</td>
                <td>${booking.guests}</td>
                <td>${formatDate(booking.date)}</td>
                <td>${booking.time}</td>
                <td>
                    <span class="status-badge status-${booking.status}">
                        ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                </td>
                <td>${formatDateTime(booking.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-whatsapp" onclick="confirmViaWhatsApp('${booking.id}')" title="Confirm via WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button class="action-btn btn-view" onclick="viewBookingDetails('${booking.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn btn-confirm" onclick="updateBookingStatus('${booking.id}', 'confirmed')" title="Mark as Confirmed">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn btn-cancel" onclick="updateBookingStatus('${booking.id}', 'cancelled')" title="Mark as Cancelled">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    // Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
    
    // Format date and time
    function formatDateTime(dateTimeString) {
        const date = new Date(dateTimeString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // View booking details
    window.viewBookingDetails = async function(bookingId) {
        try {
            const response = await fetch(`/api/bookings`);
            const bookings = await response.json();
            const booking = bookings.find(b => b.id === bookingId);
            
            if (!booking) {
                alert('Booking not found');
                return;
            }
            
            // Show modal with booking details
            showBookingModal(booking);
        } catch (error) {
            console.error('Error fetching booking details:', error);
            alert('Error loading booking details');
        }
    };
    
    // Show booking modal
    function showBookingModal(booking) {
        const modal = document.getElementById('booking-modal');
        const modalBody = document.getElementById('modal-body');
        const modalActions = document.getElementById('modal-actions');
        
        // Populate modal body
        modalBody.innerHTML = `
            <div class="booking-details">
                <div class="detail-group">
                    <label>Name</label>
                    <p>${escapeHtml(booking.name)}</p>
                </div>
                <div class="detail-group">
                    <label>Phone</label>
                    <p>${escapeHtml(booking.phone)}</p>
                </div>
                <div class="detail-group">
                    <label>Email</label>
                    <p>${escapeHtml(booking.email)}</p>
                </div>
                <div class="detail-group">
                    <label>Guests</label>
                    <p>${booking.guests}</p>
                </div>
                <div class="detail-group">
                    <label>Date</label>
                    <p>${formatDate(booking.date)}</p>
                </div>
                <div class="detail-group">
                    <label>Time</label>
                    <p>${booking.time}</p>
                </div>
                <div class="detail-group">
                    <label>Status</label>
                    <p><span class="status-badge status-${booking.status}">
                        ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span></p>
                </div>
                <div class="detail-group">
                    <label>Occasion</label>
                    <p>${booking.occasion || 'N/A'}</p>
                </div>
                <div class="detail-group full-width">
                    <label>Special Requests / Allergies</label>
                    <p>${booking.specialRequests ? escapeHtml(booking.specialRequests) : 'N/A'}</p>
                </div>
                <div class="detail-group">
                    <label>Created At</label>
                    <p>${formatDateTime(booking.createdAt)}</p>
                </div>
                ${booking.updatedAt ? `
                <div class="detail-group">
                    <label>Updated At</label>
                    <p>${formatDateTime(booking.updatedAt)}</p>
                </div>
                ` : ''}
            </div>
        `;
        
        // Populate modal actions
        modalActions.innerHTML = `
            <button class="btn btn-whatsapp" onclick="confirmViaWhatsApp('${booking.id}', true)">
                <i class="fab fa-whatsapp"></i> Confirm via WhatsApp
            </button>
            ${booking.status !== 'confirmed' ? `
            <button class="btn btn-confirm" onclick="updateBookingStatus('${booking.id}', 'confirmed', true)">
                <i class="fas fa-check"></i> Mark as Confirmed
            </button>
            ` : ''}
            ${booking.status !== 'cancelled' ? `
            <button class="btn btn-cancel" onclick="updateBookingStatus('${booking.id}', 'cancelled', true)">
                <i class="fas fa-times"></i> Mark as Cancelled
            </button>
            ` : ''}
            <button class="btn btn-outline" id="modal-close-btn">
                <i class="fas fa-times"></i> Close
            </button>
        `;
        
        // Show modal
        modal.classList.add('active');
        
        // Close modal handlers
        document.getElementById('modal-close').addEventListener('click', closeModal);
        document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
    }
    
    // Close modal
    function closeModal() {
        const modal = document.getElementById('booking-modal');
        modal.classList.remove('active');
    }
    
    // Update booking status
    window.updateBookingStatus = async function(bookingId, status, closeModalAfter = false) {
        if (!confirm(`Are you sure you want to mark this booking as ${status}?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/bookings/${bookingId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            
            if (response.ok) {
                // Reload bookings to update the table
                await loadBookings();
                
                if (closeModalAfter) {
                    closeModal();
                }
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error updating booking:', error);
            alert('Error updating booking status');
        }
    };
    
    // Confirm via WhatsApp
    window.confirmViaWhatsApp = async function(bookingId, closeModalAfter = false) {
        try {
            const response = await fetch(`/api/bookings`);
            const bookings = await response.json();
            const booking = bookings.find(b => b.id === bookingId);
            
            if (!booking) {
                alert('Booking not found');
                return;
            }
            
            // Format phone number for WhatsApp
            let phone = booking.phone.replace(/\D/g, '');
            if (phone.startsWith('0')) {
                phone = '44' + phone.substring(1);
            }
            
            // Create message
            const message = `Hello ${booking.name}, this is Appayon Indian Restaurant.
Your reservation is confirmed:
Date: ${booking.date}
Time: ${booking.time}
Guests: ${booking.guests}
Occasion: ${booking.occasion || 'N/A'}
Special requests: ${booking.specialRequests || 'N/A'}
We look forward to welcoming you!`;
            
            // Encode message for URL
            const encodedMessage = encodeURIComponent(message);
            
            // Open WhatsApp
            window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
            
            // Auto-update status to confirmed
            await updateBookingStatus(bookingId, 'confirmed');
            
            if (closeModalAfter) {
                closeModal();
            }
        } catch (error) {
            console.error('Error confirming via WhatsApp:', error);
            alert('Error opening WhatsApp');
        }
    };
    
    // Initialize date input for filters
    const filterDateInput = document.getElementById('filter-date');
    if (filterDateInput) {
        const today = new Date().toISOString().split('T')[0];
        filterDateInput.value = today;
        filterDateInput.min = today;
    }
});
```
