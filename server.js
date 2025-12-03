```javascript
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Path to bookings file
const BOOKINGS_FILE = path.join(__dirname, 'data', 'bookings.json');

// Initialize bookings file if it doesn't exist
async function initializeBookingsFile() {
  try {
    await fs.access(BOOKINGS_FILE);
  } catch {
    await fs.mkdir(path.dirname(BOOKINGS_FILE), { recursive: true });
    await fs.writeFile(BOOKINGS_FILE, JSON.stringify([], null, 2));
  }
}

// Read bookings from file
async function readBookings() {
  try {
    const data = await fs.readFile(BOOKINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading bookings:', error);
    return [];
  }
}

// Write bookings to file
async function writeBookings(bookings) {
  try {
    await fs.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
  } catch (error) {
    console.error('Error writing bookings:', error);
    throw error;
  }
}

// API Routes

// GET all bookings with optional filters
app.get('/api/bookings', async (req, res) => {
  try {
    let bookings = await readBookings();
    
    // Filter by date if provided
    if (req.query.date) {
      bookings = bookings.filter(booking => booking.date === req.query.date);
    }
    
    // Filter by status if provided
    if (req.query.status && req.query.status !== 'all') {
      bookings = bookings.filter(booking => booking.status === req.query.status);
    }
    
    // Sort by creation date (newest first)
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// POST a new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const booking = req.body;
    
    // Basic validation
    const requiredFields = ['name', 'phone', 'email', 'guests', 'date', 'time'];
    for (const field of requiredFields) {
      if (!booking[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(booking.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Phone validation (basic)
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    if (!phoneRegex.test(booking.phone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    
    // Create new booking with metadata
    const newBooking = {
      id: Date.now().toString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...booking
    };
    
    // Read current bookings, add new one, and save
    const bookings = await readBookings();
    bookings.push(newBooking);
    await writeBookings(bookings);
    
    res.status(201).json(newBooking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// PATCH update booking status
app.patch('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }
    
    const bookings = await readBookings();
    const bookingIndex = bookings.findIndex(b => b.id === id);
    
    if (bookingIndex === -1) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Update booking
    bookings[bookingIndex].status = status;
    bookings[bookingIndex].updatedAt = new Date().toISOString();
    
    await writeBookings(bookings);
    
    res.json(bookings[bookingIndex]);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Start server
async function startServer() {
  await initializeBookingsFile();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
  });
}

startServer();
```
