# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install MongoDB

If you don't have MongoDB installed:

**Ubuntu/Debian:**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Arch Linux:**
```bash
sudo pacman -S mongodb-bin
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### Step 2: Run Setup

```bash
cd "/home/IAteNoodles/Projects/Big_O/Ignis v1"
./setup.fish
```

### Step 3: Start the Application

**Easy Way - Use the startup script:**
```bash
./start.sh
```

That's it! The script will:
- ✅ Check MongoDB connection
- ✅ Start FastAPI backend with Uvicorn (port 5000)
- ✅ Start frontend server (port 8080)
- ✅ Create log files in `logs/` directory
- ✅ Display service URLs and status

**Access the application:**
- Frontend: http://localhost:8080
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/docs

---

## 🎮 Managing Services

```bash
./start.sh start     # Start all services
./start.sh stop      # Stop all services
./start.sh restart   # Restart all services
./start.sh status    # Check service status
./start.sh logs      # View real-time logs
```

---

## 🎯 Quick Test

Test the API is working:
```bash
curl http://localhost:5000/api/health
```

Expected response: `{"status":"healthy","timestamp":"..."}`

Test with the interactive API docs:
- Open http://localhost:5000/docs in your browser
- Try the `/api/health` endpoint

---

## 📝 First Time Usage

1. **Enter Your Details**
   - Name: Your name
   - Club: Select from dropdown

2. **Add Your First Entry**
   - Company: Any company name
   - At least one contact: email, LinkedIn, or phone
   - Status: Defaults to "Yet to contact"
   - Date: Defaults to today

3. **View Your Data**
   - Click "Entries List" to see all entries
   - Click "Statistics" to see charts

---

## � Logging

All logs are in the `logs/` directory:

```bash
# View backend logs
tail -f logs/backend.log

# View frontend logs  
tail -f logs/frontend.log

# View startup logs
tail -f logs/startup.log

# Or view all logs together
./start.sh logs
```

---

## �🔧 Configuration

Edit `backend/.env` to change:
- MongoDB connection string
- Database name
- Port numbers

---

## 🔥 Hot Reload

The backend uses Uvicorn with hot reload enabled:
- Any changes to Python files automatically restart the server
- No need to manually restart during development
- Logs will show reload events

---

## 💡 Pro Tips

- The app saves your name/club in browser localStorage
- You can filter entries by multiple criteria
- Status "Others" requires notes
- All dates are stored in ISO format
- Charts update in real-time
- Use http://localhost:5000/docs for interactive API testing
- Check logs/ directory for debugging

---

## ❓ Need Help?

**Service won't start?**
```bash
./start.sh status  # Check what's running
./start.sh stop    # Stop everything
./start.sh start   # Try again
```

**MongoDB connection issues?**
```bash
sudo systemctl status mongod  # Check if MongoDB is running
sudo systemctl start mongod   # Start MongoDB
```

**Port already in use?**
```bash
# The script automatically kills processes on ports 5000 and 8080
# Or manually check:
lsof -ti:5000  # Check port 5000
lsof -ti:8080  # Check port 8080
```

**Check logs:**
```bash
./start.sh logs  # Real-time logs
grep ERROR logs/backend.log  # Search for errors
```

---

See the full README.md for:
- Complete API documentation
- Data model details
- Development tips
- Advanced configuration

