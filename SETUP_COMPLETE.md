# Tracking System - Complete Setup ✅

## What We've Built

A full-stack tracking application with:
- **Frontend**: Static HTML/CSS/JavaScript
- **Backend**: FastAPI with Uvicorn (hot reload enabled)
- **Database**: MongoDB (managed by the script)
- **Logging**: Comprehensive logging to files

## Project Structure

```
Ignis v1/
├── backend/
│   ├── app.py              # FastAPI application
│   ├── database.py         # MongoDB connection
│   ├── models.py           # Pydantic models  
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment template
│   └── venv/               # Virtual environment
├── frontend/
│   ├── index.html          # Main page
│   ├── styles.css          # Styling
│   └── script.js           # JavaScript logic
├── logs/                   # Auto-created logs directory
│   ├── mongodb.log         # MongoDB logs
│   ├── backend.log         # Backend logs
│   ├── frontend.log        # Frontend logs
│   └── *.pid               # Process IDs
├── data/mongodb/           # MongoDB data directory
├── mongod.conf             # MongoDB config (auto-generated)
├── start.sh                # Main startup script ⭐
├── setup.sh                # Setup script
└── README.md               # Full documentation
```

## Quick Start

### 1. Setup (First Time Only)
```bash
./setup.sh
```

This will:
- Create virtual environment
- Install Python dependencies
- Create .env file

### 2. Start Everything
```bash
./start.sh
```

This automatically:
- Starts MongoDB
- Starts FastAPI backend (port 5000)
- Starts frontend server (port 8080)
- Creates all necessary logs

### 3. Access the Application

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:5000
- **API Docs**: http://localhost:5000/docs (Interactive!)

## Script Commands

```bash
./start.sh start     # Start all services (default)
./start.sh stop      # Stop all services
./start.sh restart   # Restart everything
./start.sh status    # Check what's running
./start.sh logs      # View real-time logs
./start.sh mongodb   # Start only MongoDB
./start.sh backend   # Start only backend
./start.sh frontend  # Start only frontend
./start.sh help      # Show help
```

## Features

### Backend (FastAPI)
- ✅ Auto-generated API documentation
- ✅ Hot reload during development
- ✅ Comprehensive logging
- ✅ Pydantic validation
- ✅ CORS enabled for frontend

### Frontend
- ✅ User login (name + club)
- ✅ Entry form with validation
- ✅ Filtering by name, club, dates
- ✅ Statistics dashboard
- ✅ Real-time charts
- ✅ Local storage for user session

### Logging System
All logs are saved to `logs/` directory:
- MongoDB logs
- Backend application logs (includes all API requests)
- Frontend server logs
- Startup script logs

View logs in real-time:
```bash
./start.sh logs
```

Or individually:
```bash
tail -f logs/backend.log
tail -f logs/mongodb.log
```

## API Endpoints

### Entries
- `POST /api/entries` - Create new entry
- `GET /api/entries` - Get all entries (with filters)
- `GET /api/entries/{id}` - Get specific entry
- `PUT /api/entries/{id}` - Update entry
- `DELETE /api/entries/{id}` - Delete entry

### Statistics
- `GET /api/stats` - Get aggregated statistics

### Health
- `GET /api/health` - Health check

### Interactive API Docs
Visit http://localhost:5000/docs to:
- See all endpoints
- Try them directly in the browser
- View request/response schemas

## Validation Rules

- Company is required
- At least one contact method (email, LinkedIn, or phone)
- Club must be from predefined list
- Status must be from predefined list
- If status is "Others", notes are required
- Phone must have at least 7 digits

## Development

### Hot Reload
The backend automatically reloads when you edit Python files:
1. Edit any `.py` file in `backend/`
2. Save the file
3. Uvicorn automatically reloads
4. Check `logs/backend.log` to see reload message

### Debugging
All errors are logged with full stack traces in `logs/backend.log`:
```bash
grep ERROR logs/backend.log
```

## Troubleshooting

### MongoDB won't start
The script automatically handles MongoDB startup. If issues persist:
```bash
# Check MongoDB logs
cat logs/mongodb.log

# Or start manually
mongod --dbpath ./data/mongodb --port 27017
```

### Port already in use
The script automatically kills processes on ports 5000, 8080, and 27017.

### Backend errors
Check the logs:
```bash
tail -f logs/backend.log
```

### View all running services
```bash
./start.sh status
```

## Environment Variables

Edit `backend/.env`:
```bash
MONGO_URI=mongodb://localhost:27017/
DB_NAME=tracking_db
```

## Production Notes

For production deployment:
1. Update MongoDB URI in `.env`
2. Set proper CORS origins in `backend/app.py`
3. Use proper process manager (systemd, supervisor)
4. Enable MongoDB authentication
5. Use nginx/Apache for frontend
6. Consider using gunicorn instead of uvicorn for production

## Files to Ignore (Already in .gitignore)

- `logs/`
- `data/`
- `backend/venv/`
- `backend/.env`
- `*.pid`

## Summary

✅ FastAPI backend with hot reload
✅ MongoDB database (auto-managed)
✅ Static frontend
✅ Comprehensive logging
✅ Single command startup
✅ Interactive API documentation
✅ Pydantic validation
✅ Easy development workflow

**Start developing:**
```bash
./start.sh
# Edit files
# Changes auto-reload
# Check logs/backend.log for output
```

**Stop everything:**
```bash
./start.sh stop
```

Enjoy! 🎉
