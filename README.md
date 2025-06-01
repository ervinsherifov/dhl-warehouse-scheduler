# 🚛 DHL SOF Warehouse Event Scheduler

A complete web-based event scheduling system for DHL's Sofia warehouse operations.

## 🚀 Quick Start

```bash
# Start the application
./start.sh
```

**Then open:** http://localhost:5000

## 🔑 Default Admin Credentials
- **Username:** admin
- **Password:** dhl2025

## ✨ Features

### 📊 Dashboard (TV Display)
- Real-time event timeline
- 24-hour time format
- Auto-refresh every 30 seconds
- Color-coded event types (FTL=red, PTL=yellow)
- Large, readable fonts for warehouse TV display

### 📝 Event Creation
- Event Type: Truck Arrival, Client Visit, Other
- Truck Details: Plate number, purpose (Loading/Unloading)
- Load Types: PTL (30 min), FTL (1 hour)
- Date & Time picker (24-hour format)
- Creator email tracking
- Optional notes

### 🔧 Admin Panel
- Secure login system
- View all events (completed, pending, deleted)
- Mark events as completed
- Delete events
- Export events to CSV
- Filter and search functionality

### 🎨 DHL Branding
- Official DHL colors (Red: #BA0C2F, Yellow: #FFD900)
- Professional warehouse-appropriate design
- Mobile responsive interface

## 🏗️ Technical Stack

- **Backend:** Node.js + Express + SQLite
- **Frontend:** HTML5 + CSS3 + Vanilla JavaScript
- **Database:** SQLite with automatic initialization
- **API:** RESTful endpoints with proper error handling

## 📁 Project Structure

```
dhl-warehouse-scheduler/
├── backend/
│   ├── server.js           # Express server
│   ├── package.json        # Backend dependencies
│   └── warehouse_events.db # SQLite database
├── frontend/
│   ├── index.html          # Main application
│   ├── styles.css          # DHL-branded styles
│   └── app.js              # Frontend logic
├── start.sh                # Quick start script
├── .env                    # Configuration
└── README.md               # This file
```

## 🔧 Manual Setup

If you need to set up manually:

```bash
# Backend
cd backend
npm install
node server.js

# Frontend is served by backend at http://localhost:5000
```

## 🌐 API Endpoints

- `GET /api/health` - Health check
- `GET /api/events` - Get events (supports ?filter=upcoming)
- `POST /api/events` - Create new event
- `PATCH /api/events/:id` - Update event status
- `DELETE /api/events/:id` - Delete event
- `POST /api/admin/login` - Admin authentication
- `GET /api/events/export/csv` - Export to CSV

## 📱 Usage

### For Warehouse Staff:
1. **View Dashboard** - See upcoming events on TV display
2. **Create Events** - Use the form to schedule truck arrivals and visits
3. **24-hour Format** - All times displayed in warehouse-standard format

### For Supervisors:
1. **Admin Login** - Access admin panel with credentials
2. **Manage Events** - Complete, delete, or modify event status
3. **Export Data** - Download CSV reports for analysis
4. **Monitor Operations** - Track all warehouse activities

## 🔒 Security

- Admin authentication with bcrypt password hashing
- Input validation and sanitization
- CORS protection
- SQL injection prevention

## 🚢 Deployment

This system is ready for deployment to:
- **Local Server** - Run with `./start.sh`
- **Docker** - Container-ready setup
- **Cloud Platforms** - Vercel, AWS, GCP, etc.

## 📞 Support

For technical issues:
- Check logs in the terminal
- Verify http://localhost:5000/api/health
- Ensure no port conflicts on 5000

## 📄 License

MIT License - DHL Development Team

---

**🚛 Ready for Sofia warehouse operations!**
