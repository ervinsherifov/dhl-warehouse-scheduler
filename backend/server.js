const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true
}));
app.use(express.json());

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize SQLite database
const db = new sqlite3.Database('warehouse_events.db', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✓ Connected to SQLite database');
  }
});

// Create tables and insert sample data
db.serialize(() => {
  // Events table
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      truck_plate TEXT,
      purpose TEXT,
      load_type TEXT,
      date_time DATETIME NOT NULL,
      duration INTEGER NOT NULL DEFAULT 30,
      created_by TEXT NOT NULL,
      notes TEXT,
      completed BOOLEAN DEFAULT 0,
      deleted BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating events table:', err);
    } else {
      console.log('✓ Events table ready');
    }
  });

  // Admin users table
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating admin_users table:', err);
    } else {
      console.log('✓ Admin users table ready');
    }
  });

  // Create default admin user
  bcrypt.hash('dhl2025', 10, (err, hash) => {
    if (!err) {
      db.run(`
        INSERT OR IGNORE INTO admin_users (username, password_hash) 
        VALUES ('admin', ?)
      `, [hash], (err) => {
        if (!err) {
          console.log('✓ Default admin user created (username: admin, password: dhl2025)');
        }
      });
    }
  });

  // Insert sample events
  const sampleEvents = [
    {
      type: 'Truck Arrival',
      truck_plate: 'SF1234AB',
      purpose: 'Loading',
      load_type: 'FTL',
      date_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      duration: 60,
      created_by: 'coordinator@dhl.com',
      notes: 'Priority shipment - fragile items'
    },
    {
      type: 'Truck Arrival', 
      truck_plate: 'SF5678CD',
      purpose: 'Unloading',
      load_type: 'PTL',
      date_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      duration: 30,
      created_by: 'logistics@dhl.com',
      notes: 'Standard delivery'
    },
    {
      type: 'Client Visit',
      truck_plate: null,
      purpose: null,
      load_type: null,
      date_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      duration: 45,
      created_by: 'sales@dhl.com',
      notes: 'Contract renewal meeting'
    }
  ];

  // Clear existing sample data and insert new
  db.run('DELETE FROM events WHERE created_by LIKE "%@dhl.com"', () => {
    sampleEvents.forEach(event => {
      db.run(`
        INSERT INTO events (type, truck_plate, purpose, load_type, date_time, duration, created_by, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        event.type, event.truck_plate, event.purpose, event.load_type,
        event.date_time, event.duration, event.created_by, event.notes
      ], (err) => {
        if (!err) {
          console.log(`✓ Sample event created: ${event.type} - ${event.truck_plate || 'N/A'}`);
        }
      });
    });
  });
});

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Get all events
app.get('/api/events', (req, res) => {
  const { filter } = req.query;
  let query = 'SELECT * FROM events WHERE deleted = 0';
  
  if (filter === 'upcoming') {
    query += ' AND completed = 0 AND datetime(date_time) > datetime("now")';
  } else if (filter === 'completed') {
    query += ' AND completed = 1';
  } else if (filter === 'pending') {
    query += ' AND completed = 0';
  }
  
  query += ' ORDER BY date_time ASC';
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    const events = rows.map(row => ({
      ...row,
      completed: Boolean(row.completed),
      deleted: Boolean(row.deleted)
    }));
    
    res.json(events);
  });
});

// Create new event
app.post('/api/events', (req, res) => {
  const { type, truck_plate, purpose, load_type, date_time, created_by, notes } = req.body;
  
  // Validation
  if (!type || !date_time || !created_by) {
    res.status(400).json({ error: 'Missing required fields: type, date_time, created_by' });
    return;
  }
  
  if (type === 'Truck Arrival' && (!truck_plate || !purpose || !load_type)) {
    res.status(400).json({ error: 'Truck arrivals require truck_plate, purpose, and load_type' });
    return;
  }
  
  // Calculate duration
  let duration = 30;
  if (load_type === 'FTL') duration = 60;
  if (load_type === 'PTL') duration = 30;
  
  db.run(`
    INSERT INTO events (type, truck_plate, purpose, load_type, date_time, duration, created_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [type, truck_plate, purpose, load_type, date_time, duration, created_by, notes], function(err) {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Failed to create event' });
      return;
    }
    
    res.status(201).json({ 
      id: this.lastID, 
      message: 'Event created successfully',
      duration: duration
    });
  });
});

// Update event
app.patch('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const { completed, deleted } = req.body;
  
  let updates = [];
  let params = [];
  
  if (typeof completed === 'boolean') {
    updates.push('completed = ?');
    params.push(completed ? 1 : 0);
  }
  
  if (typeof deleted === 'boolean') {
    updates.push('deleted = ?');
    params.push(deleted ? 1 : 0);
  }
  
  if (updates.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }
  
  const query = `UPDATE events SET ${updates.join(', ')} WHERE id = ?`;
  params.push(id);
  
  db.run(query, params, function(err) {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Failed to update event' });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    res.json({ message: 'Event updated successfully' });
  });
});

// Delete event
app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('UPDATE events SET deleted = 1 WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Failed to delete event' });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    
    res.json({ message: 'Event deleted successfully' });
  });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }
  
  db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    bcrypt.compare(password, user.password_hash, (err, isValid) => {
      if (err || !isValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      
      res.json({ 
        message: 'Login successful',
        user: { id: user.id, username: user.username }
      });
    });
  });
});

// Export CSV
app.get('/api/events/export/csv', (req, res) => {
  db.all('SELECT * FROM events ORDER BY date_time DESC', [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    const headers = ['ID', 'Type', 'Truck Plate', 'Purpose', 'Load Type', 'Date Time', 'Duration', 'Created By', 'Notes', 'Completed', 'Deleted'];
    const csvContent = [
      headers.join(','),
      ...rows.map(row => [
        row.id,
        `"${row.type}"`,
        `"${row.truck_plate || ''}"`,
        `"${row.purpose || ''}"`,
        `"${row.load_type || ''}"`,
        `"${row.date_time}"`,
        row.duration,
        `"${row.created_by}"`,
        `"${row.notes || ''}"`,
        row.completed ? 'Yes' : 'No',
        row.deleted ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=warehouse_events.csv');
    res.send(csvContent);
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚛 DHL Warehouse Scheduler running on http://localhost:${PORT}`);
  console.log('📊 API endpoints:');
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Events: http://localhost:${PORT}/api/events`);
  console.log('🔑 Admin credentials: admin / dhl2025');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed.');
      }
      process.exit(0);
    });
  });
});

module.exports = app;
