```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar')) {
            navLinks.classList.remove('active');
        }
    });
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Close mobile menu if open
                navLinks.classList.remove('active');
                
                // Calculate header height
                const headerHeight = document.querySelector('.navbar').offsetHeight;
                
                // Scroll to element
                window.scrollTo({
                    top: targetElement.offsetTop - headerHeight,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Scroll to booking form
    document.querySelectorAll('.scroll-to-booking').forEach(button => {
        button.addEventListener('click', () => {
            const bookingSection = document.querySelector('#reservation');
            if (bookingSection) {
                const headerHeight = document.querySelector('.navbar').offsetHeight;
                window.scrollTo({
                    top: bookingSection.offsetTop - headerHeight,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Initialize date input
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = today;
        
        // Update time slots when date changes
        dateInput.addEventListener('change', updateTimeSlots);
        updateTimeSlots(); // Initial call
    }
    
    // Update time slots based on selected date
    function updateTimeSlots() {
        const dateInput = document.getElementById('date');
        const timeSelect = document.getElementById('time');
        
        if (!dateInput || !timeSelect) return;
        
        const selectedDate = new Date(dateInput.value);
        const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
        
        // Clear existing options except the first one
        while (timeSelect.options.length > 1) {
            timeSelect.remove(1);
        }
        
        // Define time slots based on day of week
        let startHour = 17; // 5 PM
        let endHour = dayOfWeek === 5 || dayOfWeek === 6 ? 24 : 23; // Friday/Saturday: 00:00, Others: 23:00
        
        // Generate time slots
        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const option = document.createElement('option');
                option.value = timeString;
                option.textContent = timeString;
                timeSelect.appendChild(option);
            }
        }
        
        // Add 00:00 for Friday and Saturday
        if (dayOfWeek === 5 || dayOfWeek === 6) {
            const option = document.createElement('option');
            option.value = '00:00';
            option.textContent = '00:00';
            timeSelect.appendChild(option);
        }
    }
    
    // Form validation and submission
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleFormSubmit);
        
        // Real-time validation
        const formInputs = bookingForm.querySelectorAll('input, select');
        formInputs.forEach(input => {
            input.addEventListener('blur', validateField);
            input.addEventListener('input', clearFieldError);
        });
    }
    
    // Field validation
    function validateField(e) {
        const field = e.target;
        const fieldId = field.id;
        const value = field.value.trim();
        const errorElement = document.getElementById(`${fieldId}-error`);
        
        if (!errorElement) return;
        
        let error = '';
        
        switch (fieldId) {
            case 'name':
                if (!value) error = 'Full name is required';
                else if (value.length < 2) error = 'Name must be at least 2 characters';
                break;
                
            case 'phone':
                if (!value) error = 'Phone number is required';
                else if (!/^[\d\s\-\+\(\)]{10,}$/.test(value.replace(/\s/g, ''))) {
                    error = 'Please enter a valid phone number';
                }
                break;
                
            case 'email':
                if (!value) error = 'Email is required';
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = 'Please enter a valid email address';
                }
                break;
                
            case 'guests':
                if (!value) error = 'Please select number of guests';
                break;
                
            case 'date':
                if (!value) error = 'Please select a date';
                else if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
                    error = 'Please select a future date';
                }
                break;
                
            case 'time':
                if (!value) error = 'Please select a time';
                break;
        }
        
        errorElement.textContent = error;
        field.classList.toggle('error', !!error);
    }
    
    // Clear field error
    function clearFieldError(e) {
        const field = e.target;
        const errorElement = document.getElementById(`${field.id}-error`);
        
        if (errorElement) {
            errorElement.textContent = '';
            field.classList.remove('error');
        }
    }
    
    // Form submission handler
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Validate all fields
        const formInputs = bookingForm.querySelectorAll('input[required], select[required]');
        let isValid = true;
        
        formInputs.forEach(input => {
            const event = new Event('blur');
            input.dispatchEvent(event);
            if (document.getElementById(`${input.id}-error`).textContent) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            showFormMessage('Please fix the errors in the form.', 'error');
            return;
        }
        
        // Collect form data
        const formData = {
            name: document.getElementById('name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            email: document.getElementById('email').value.trim(),
            guests: document.getElementById('guests').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            occasion: document.getElementById('occasion').value || '',
            specialRequests: document.getElementById('specialRequests').value.trim() || ''
        };
        
        // Show loading state
        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;
        
        try {
            // Send booking to server
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Success
                showFormMessage('Thank you! Your reservation request has been received. We\'ll confirm shortly.', 'success');
                bookingForm.reset();
                updateTimeSlots(); // Reset time slots
                
                // Scroll to success message
                setTimeout(() => {
                    const messageElement = document.getElementById('form-message');
                    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            } else {
                // Error from server
                showFormMessage(data.error || 'Failed to submit booking. Please try again.', 'error');
            }
        } catch (error) {
            // Network error
            console.error('Error:', error);
            showFormMessage('Network error. Please check your connection and try again.', 'error');
        } finally {
            // Reset button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    // Show form message
    function showFormMessage(message, type) {
        const messageElement = document.getElementById('form-message');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `form-message ${type}`;
            
            // Auto-hide success message after 10 seconds
            if (type === 'success') {
                setTimeout(() => {
                    messageElement.textContent = '';
                    messageElement.className = 'form-message';
                }, 10000);
            }
        }
    }
    
    // Update footer year
    const currentYear = new Date().getFullYear();
    document.querySelectorAll('.footer .footer-links p').forEach(p => {
        if (p.textContent.includes('2024')) {
            p.textContent = p.textContent.replace('2024', currentYear);
        }
    });
});
```
