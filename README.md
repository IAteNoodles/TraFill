# Tracking System

A full-stack tracking application for managing company outreach and opportunities with MongoDB as the database.

## Features

- **User Registration**: Enter name and select club before accessing the system
- **Entry Management**: Track company outreach with detailed contact information
- **Duplicate Prevention**: Automatically blocks duplicate contact entries (email/phone/LinkedIn)
- **Company Validation**: Warns about existing companies and financial services companies
- **Smart Filtering**: Filter entries by name, club, and date range
- **Comprehensive Statistics**: View detailed analytics with filtering capabilities
- **Data Validation**: Ensure data integrity with Pydantic models
- **Quality of Life Features**: Keyboard shortcuts, auto-save drafts, export capabilities

## Tech Stack

### Backend
- **Framework**: FastAPI (modern, fast, with auto-generated API docs)
- **ASGI Server**: Uvicorn with hot reload
- **Database**: MongoDB (NoSQL)
- **Validation**: Pydantic v2
- **Logging**: Python logging module with file and console output

### Frontend
- **Technology**: Vanilla JavaScript (Static HTML/CSS/JS)
- **Styling**: Modern gradient design with responsive layout
- **Features**: Tab-based navigation, real-time filtering, charts

## Project Structure

```
.
├── backend/
│   ├── app.py              # Flask application with API endpoints
│   ├── database.py         # MongoDB connection and initialization
│   ├── models.py           # Pydantic models for validation
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variables template
└── frontend/
    ├── index.html          # Main HTML page
    ├── styles.css          # CSS styling
    └── script.js           # JavaScript logic
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- MongoDB (running locally or cloud instance)
- Modern web browser

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env file with your MongoDB connection string
   ```

5. **Start MongoDB** (if running locally):
   ```bash
   mongod
   # Or on Linux with systemd:
   sudo systemctl start mongod
   ```

### Quick Start with Script

The easiest way to start the application is using the provided startup script:

```bash
# Make script executable (first time only)
chmod +x start.sh

# Start all services
./start.sh start

# Or simply
./start.sh
```

The script will:
- Check if MongoDB is running
- Start the FastAPI backend with Uvicorn (hot reload enabled)
- Start the frontend HTTP server
- Create and manage log files
- Provide colored output and status information

**Other script commands:**
```bash
./start.sh stop      # Stop all services
./start.sh restart   # Restart all services
./start.sh status    # Show service status
./start.sh logs      # Tail application logs
./start.sh backend   # Start only backend
./start.sh frontend  # Start only frontend
./start.sh help      # Show help
```

### Manual Start

If you prefer to start services manually:

**Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 5000 --reload
```

**Frontend:**
```bash
cd frontend
python -m http.server 8080
```

## API Endpoints

### Entries

- `POST /api/entries` - Create a new entry
- `GET /api/entries` - Get all entries (with optional filters)
  - Query params: `member_name`, `club`, `start_date`, `end_date`
- `GET /api/entries/<id>` - Get a specific entry
- `PUT /api/entries/<id>` - Update an entry
- `DELETE /api/entries/<id>` - Delete an entry

### Statistics

- `GET /api/stats` - Get statistics about entries
  - Returns: total entries, recent entries, status distribution, club distribution, top companies

### Health Check

- `GET /api/health` - Check API health

## Logging

The application includes comprehensive logging:

### Log Files Location

All logs are stored in the `logs/` directory:
- `logs/startup.log` - Startup script logs
- `logs/backend.log` - Backend application logs (Uvicorn + FastAPI)
- `logs/frontend.log` - Frontend server logs
- `logs/backend.pid` - Backend process ID
- `logs/frontend.pid` - Frontend process ID

### Log Levels

The backend logs the following events:
- **INFO**: Normal operations (requests, database queries, statistics)
- **WARNING**: Non-critical issues (missing entries, invalid IDs)
- **ERROR**: Critical errors with full stack traces

### Viewing Logs

**Real-time log monitoring:**
```bash
./start.sh logs
```

**View specific log:**
```bash
tail -f logs/backend.log    # Backend logs
tail -f logs/frontend.log   # Frontend logs
tail -f logs/startup.log    # Startup logs
```

**Search logs:**
```bash
grep "ERROR" logs/backend.log
grep "Creating new entry" logs/backend.log
```

## API Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc

These interfaces allow you to:
- View all available endpoints
- Test API calls directly from the browser
- See request/response schemas
- Download OpenAPI specification

## Usage

1. **Initial Setup**:
   - Enter your name and select your club on the welcome screen
   - This information will be saved locally and auto-filled for entries

2. **Adding Entries**:
   - Fill in company name (required)
   - Add type, contact person details (optional)
   - Provide at least one contact method: email, LinkedIn, or phone
   - Select status (defaults to "Yet to contact")
   - If status is "Others", provide notes
   - **Automatic Validation**:
     - System checks if email/phone/LinkedIn already exists (blocks duplicates)
     - Warns if company was already contacted (allows different contacts)
     - Alerts if company is financial/banking/fintech (can override)
   - Submit the entry

3. **Viewing Entries**:
   - Switch to "Entries List" tab
   - Use filters to narrow down entries by name, club, or date range
   - View all tracked companies and their details

4. **Statistics**:
   - Switch to "Statistics" tab
   - Apply filters (club, member, date range) for focused insights
   - View comprehensive metrics including:
     - Summary statistics
     - Status distribution
     - Daily activity timeline
     - Club performance with success rates
     - Member contribution leaderboard
     - Contact method analysis
     - Top companies and opportunity types

## Validation Features

See **[VALIDATION_FEATURES.md](VALIDATION_FEATURES.md)** for detailed information about:
- Duplicate contact prevention (email/phone/LinkedIn)
- Company existence warnings
- Financial services company detection
- Validation flow and API details

## Data Model

### Entry Schema

```python
{
    "member_name": str,          # Required
    "club": str,                 # Required (from predefined list)
    "company": str,              # Required
    "opportunity_type": str,     # Optional
    "contact_person": str,       # Optional
    "email": str,                # Optional (EmailStr validation)
    "linkedin": str,             # Optional
    "phone": str,                # Optional (min 7 digits)
    "status": str,               # Required (from predefined list)
    "status_notes": str,         # Required if status is "Others"
    "entry_date": str,           # Required (ISO date format)
    "created_at": str,           # Auto-generated
    "updated_at": str            # Auto-generated
}
```

### Validation Rules

- At least one contact method (email, LinkedIn, or phone) is required
- Club must be one of: "The Big O", "Nature Watch", "8x8", "Acharya Gaming Club", "Others"
- Status must be one of: "Yet to contact", "In progress", "Rejected", "Requested on LinkedIn", "Requested on mail", "Others"
- If status is "Others", status_notes is required
- Phone must contain at least 7 digits

## MongoDB Collections

### entries

Stores all entry documents with indexes on:
- `member_name`
- `club`
- `entry_date`
- `company`
- `status`

## Environment Variables

- `MONGO_URI`: MongoDB connection string (default: `mongodb://localhost:27017/`)
- `DB_NAME`: Database name (default: `tracking_db`)
- `FLASK_ENV`: Flask environment (development/production)
- `FLASK_DEBUG`: Enable debug mode (True/False)

## Development

### Adding New Features

1. **Backend**: Add new endpoints in `app.py`, update models in `models.py`
2. **Frontend**: Update HTML structure, styling in CSS, and logic in JavaScript
3. **Database**: Modify schema in `database.py` if needed

### Testing

Test the API using tools like:
- curl
- Postman
- Thunder Client (VS Code extension)

Example:
```bash
curl -X POST http://localhost:5000/api/entries \
  -H "Content-Type: application/json" \
  -d '{
    "member_name": "John Doe",
    "club": "The Big O",
    "company": "Tech Corp",
    "email": "contact@techcorp.com",
    "status": "Yet to contact",
    "entry_date": "2025-10-18"
  }'
```

## Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running: `systemctl status mongod` (Linux) or check Task Manager (Windows)
- Verify connection string in `.env` file
- Check firewall settings if using remote MongoDB

### CORS Errors

- Ensure Flask-CORS is installed: `pip install flask-cors`
- Backend must be running on the expected port (5000)
- Update `API_BASE_URL` in `script.js` if using different port

### Data Not Showing

- Check browser console for errors
- Verify API is responding: visit `http://localhost:5000/api/health`
- Clear browser cache and localStorage

## Future Enhancements

- User authentication and authorization
- Export data to CSV/Excel
- Email notifications
- Advanced analytics and reporting
- Mobile responsive improvements
- Dark mode theme
- Bulk import/export functionality

## License

This project is for educational purposes.
