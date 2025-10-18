#!/bin/bash

# Tracking System Startup Script
# This script starts both backend and frontend services with proper logging

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
LOGS_DIR="$PROJECT_ROOT/logs"
DATA_DIR="$PROJECT_ROOT/data/mongodb"
MONGOD_CONF="$PROJECT_ROOT/mongod.conf"

# Log files
BACKEND_LOG="$LOGS_DIR/backend.log"
FRONTEND_LOG="$LOGS_DIR/frontend.log"
MONGODB_LOG="$LOGS_DIR/mongodb.log"
STARTUP_LOG="$LOGS_DIR/startup.log"

# PID files
BACKEND_PID="$LOGS_DIR/backend.pid"
FRONTEND_PID="$LOGS_DIR/frontend.pid"
MONGODB_PID="$LOGS_DIR/mongodb.pid"

# Configuration
BACKEND_PORT=5000
FRONTEND_PORT=8080

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$STARTUP_LOG"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$STARTUP_LOG"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$STARTUP_LOG"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$STARTUP_LOG"
}

# Function to create logs directory
create_logs_dir() {
    if [ ! -d "$LOGS_DIR" ]; then
        mkdir -p "$LOGS_DIR"
        print_info "Created logs directory at $LOGS_DIR"
    fi
    
    if [ ! -d "$DATA_DIR" ]; then
        mkdir -p "$DATA_DIR"
        print_info "Created MongoDB data directory at $DATA_DIR"
    fi
}

# Function to check if MongoDB is running
check_mongodb() {
    print_info "Checking MongoDB connection..."
    
    # Wait a bit for MongoDB to be ready
    sleep 1
    
    if command -v mongosh &> /dev/null; then
        # MongoDB Shell (newer versions)
        if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
            print_success "MongoDB is running"
            return 0
        fi
    elif command -v mongo &> /dev/null; then
        # Legacy mongo shell
        if mongo --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
            print_success "MongoDB is running"
            return 0
        fi
    fi
    
    return 1
}

# Function to start MongoDB
start_mongodb() {
    print_info "Starting MongoDB server..."
    
    # Check if MongoDB is already running
    if check_mongodb; then
        print_success "MongoDB is already running"
        return 0
    fi
    
    # Check if mongod is installed
    if ! command -v mongod &> /dev/null; then
        print_error "MongoDB is not installed. Please install MongoDB first."
        print_info "Visit: https://docs.mongodb.com/manual/installation/"
        return 1
    fi
    
    # Ensure data directory exists
    mkdir -p "$DATA_DIR"
    mkdir -p "$LOGS_DIR"
    
    # Generate MongoDB config with absolute paths
    cat > "$MONGOD_CONF" <<EOF
# MongoDB Configuration File (Auto-generated)

storage:
  dbPath: $DATA_DIR

net:
  port: 27017
  bindIp: 127.0.0.1

systemLog:
  destination: file
  path: $MONGODB_LOG
  logAppend: true
EOF
    
    # Start MongoDB with custom config
    print_info "Starting MongoDB on port 27017..."
    mongod --config "$MONGOD_CONF" --fork
    
    # MongoDB fork mode writes its own PID, try to find it
    sleep 2
    MONGODB_PID_NUM=$(pgrep -f "mongod --config")
    if [ ! -z "$MONGODB_PID_NUM" ]; then
        echo $MONGODB_PID_NUM > "$MONGODB_PID"
    fi
    
    # Wait for MongoDB to start
    print_info "Waiting for MongoDB to be ready..."
    for i in {1..10}; do
        if check_mongodb; then
            print_success "MongoDB started successfully (PID: $MONGODB_PID_NUM)"
            print_info "MongoDB logs: $MONGODB_LOG"
            print_info "MongoDB data: $DATA_DIR"
            return 0
        fi
        sleep 1
    done
    
    print_error "MongoDB failed to start. Check logs at $MONGODB_LOG"
    cat "$MONGODB_LOG" 2>/dev/null || print_warning "No log file found"
    return 1
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        print_warning "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Function to start backend
start_backend() {
    print_info "Starting backend server..."
    
    cd "$BACKEND_DIR"
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_error "Virtual environment not found. Please run setup first."
        return 1
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Check if port is in use
    if check_port $BACKEND_PORT; then
        print_warning "Port $BACKEND_PORT is already in use"
        kill_port $BACKEND_PORT
    fi
    
    # Start backend with uvicorn
    print_info "Starting FastAPI with Uvicorn on port $BACKEND_PORT..."
    nohup uvicorn app:app \
        --host 0.0.0.0 \
        --port $BACKEND_PORT \
        --reload \
        --log-level info \
        > "$BACKEND_LOG" 2>&1 &
    
    BACKEND_PID_NUM=$!
    echo $BACKEND_PID_NUM > "$BACKEND_PID"
    
    # Wait a bit and check if process is still running
    sleep 2
    if ps -p $BACKEND_PID_NUM > /dev/null; then
        print_success "Backend started successfully (PID: $BACKEND_PID_NUM)"
        print_info "Backend logs: $BACKEND_LOG"
        print_info "Backend API: http://localhost:$BACKEND_PORT"
        print_info "API Docs: http://localhost:$BACKEND_PORT/docs"
        return 0
    else
        print_error "Backend failed to start. Check logs at $BACKEND_LOG"
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    print_info "Starting frontend server..."
    
    cd "$FRONTEND_DIR"
    
    # Check if port is in use
    if check_port $FRONTEND_PORT; then
        print_warning "Port $FRONTEND_PORT is already in use"
        kill_port $FRONTEND_PORT
    fi
    
    # Start simple HTTP server
    print_info "Starting HTTP server on port $FRONTEND_PORT..."
    nohup python3 -m http.server $FRONTEND_PORT \
        > "$FRONTEND_LOG" 2>&1 &
    
    FRONTEND_PID_NUM=$!
    echo $FRONTEND_PID_NUM > "$FRONTEND_PID"
    
    # Wait a bit and check if process is still running
    sleep 1
    if ps -p $FRONTEND_PID_NUM > /dev/null; then
        print_success "Frontend started successfully (PID: $FRONTEND_PID_NUM)"
        print_info "Frontend logs: $FRONTEND_LOG"
        print_info "Frontend URL: http://localhost:$FRONTEND_PORT"
        return 0
    else
        print_error "Frontend failed to start. Check logs at $FRONTEND_LOG"
        return 1
    fi
}

# Function to stop services
stop_services() {
    print_info "Stopping services..."
    
    # Stop backend
    if [ -f "$BACKEND_PID" ]; then
        BACKEND_PID_NUM=$(cat "$BACKEND_PID")
        if ps -p $BACKEND_PID_NUM > /dev/null 2>&1; then
            print_info "Stopping backend (PID: $BACKEND_PID_NUM)..."
            kill $BACKEND_PID_NUM 2>/dev/null || true
            sleep 1
            # Force kill if still running
            if ps -p $BACKEND_PID_NUM > /dev/null 2>&1; then
                kill -9 $BACKEND_PID_NUM 2>/dev/null || true
            fi
            print_success "Backend stopped"
        fi
        rm -f "$BACKEND_PID"
    fi
    
    # Stop frontend
    if [ -f "$FRONTEND_PID" ]; then
        FRONTEND_PID_NUM=$(cat "$FRONTEND_PID")
        if ps -p $FRONTEND_PID_NUM > /dev/null 2>&1; then
            print_info "Stopping frontend (PID: $FRONTEND_PID_NUM)..."
            kill $FRONTEND_PID_NUM 2>/dev/null || true
            sleep 1
            # Force kill if still running
            if ps -p $FRONTEND_PID_NUM > /dev/null 2>&1; then
                kill -9 $FRONTEND_PID_NUM 2>/dev/null || true
            fi
            print_success "Frontend stopped"
        fi
        rm -f "$FRONTEND_PID"
    fi
    
    # Stop MongoDB
    if [ -f "$MONGODB_PID" ]; then
        MONGODB_PID_NUM=$(cat "$MONGODB_PID")
        if ps -p $MONGODB_PID_NUM > /dev/null 2>&1; then
            print_info "Stopping MongoDB (PID: $MONGODB_PID_NUM)..."
            kill $MONGODB_PID_NUM 2>/dev/null || true
            sleep 2
            # Force kill if still running
            if ps -p $MONGODB_PID_NUM > /dev/null 2>&1; then
                kill -9 $MONGODB_PID_NUM 2>/dev/null || true
            fi
            print_success "MongoDB stopped"
        fi
        rm -f "$MONGODB_PID"
    fi
    
    # Also kill any processes on the ports
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    kill_port 27017  # MongoDB port
}

# Function to show status
show_status() {
    echo ""
    print_info "Service Status:"
    echo ""
    
    # Check MongoDB
    if [ -f "$MONGODB_PID" ]; then
        MONGODB_PID_NUM=$(cat "$MONGODB_PID")
        if ps -p $MONGODB_PID_NUM > /dev/null 2>&1; then
            print_success "MongoDB: Running (PID: $MONGODB_PID_NUM, Port: 27017)"
        else
            print_error "MongoDB: Not running (stale PID file)"
        fi
    else
        print_warning "MongoDB: Not running"
    fi
    
    # Check backend
    if [ -f "$BACKEND_PID" ]; then
        BACKEND_PID_NUM=$(cat "$BACKEND_PID")
        if ps -p $BACKEND_PID_NUM > /dev/null 2>&1; then
            print_success "Backend: Running (PID: $BACKEND_PID_NUM, Port: $BACKEND_PORT)"
        else
            print_error "Backend: Not running (stale PID file)"
        fi
    else
        print_warning "Backend: Not running"
    fi
    
    # Check frontend
    if [ -f "$FRONTEND_PID" ]; then
        FRONTEND_PID_NUM=$(cat "$FRONTEND_PID")
        if ps -p $FRONTEND_PID_NUM > /dev/null 2>&1; then
            print_success "Frontend: Running (PID: $FRONTEND_PID_NUM, Port: $FRONTEND_PORT)"
        else
            print_error "Frontend: Not running (stale PID file)"
        fi
    else
        print_warning "Frontend: Not running"
    fi
    
    echo ""
}

# Function to tail logs
tail_logs() {
    print_info "Tailing logs (Ctrl+C to stop)..."
    echo ""
    
    local log_files=()
    [ -f "$MONGODB_LOG" ] && log_files+=("$MONGODB_LOG")
    [ -f "$BACKEND_LOG" ] && log_files+=("$BACKEND_LOG")
    [ -f "$FRONTEND_LOG" ] && log_files+=("$FRONTEND_LOG")
    
    if [ ${#log_files[@]} -gt 0 ]; then
        tail -f "${log_files[@]}"
    else
        print_warning "No log files found"
    fi
}

# Function to show help
show_help() {
    echo ""
    echo "Tracking System - Startup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start         Start all services (MongoDB, backend, frontend)"
    echo "  stop          Stop all running services"
    echo "  restart       Restart all services"
    echo "  status        Show status of services"
    echo "  logs          Tail application logs"
    echo "  backend       Start only backend service"
    echo "  frontend      Start only frontend service"
    echo "  mongodb       Start only MongoDB service"
    echo "  help          Show this help message"
    echo ""
    echo "Log files are stored in: $LOGS_DIR"
    echo "MongoDB data is stored in: $DATA_DIR"
    echo ""
}

# Main script logic
main() {
    # Create logs directory
    create_logs_dir
    
    # Clear startup log
    > "$STARTUP_LOG"
    
    print_info "=== Tracking System Startup Script ==="
    print_info "Timestamp: $(date)"
    echo ""
    
    case "${1:-start}" in
        start)
            # Start MongoDB first
            if ! start_mongodb; then
                exit 1
            fi
            
            # Start services
            if start_backend && start_frontend; then
                echo ""
                print_success "All services started successfully!"
                echo ""
                print_info "Access the application at:"
                print_info "  Frontend: http://localhost:$FRONTEND_PORT"
                print_info "  Backend API: http://localhost:$BACKEND_PORT"
                print_info "  API Documentation: http://localhost:$BACKEND_PORT/docs"
                echo ""
                print_info "To stop services, run: $0 stop"
                print_info "To view logs, run: $0 logs"
                echo ""
            else
                print_error "Failed to start all services"
                stop_services
                exit 1
            fi
            ;;
            
        stop)
            stop_services
            print_success "All services stopped"
            ;;
            
        restart)
            print_info "Restarting services..."
            stop_services
            sleep 2
            $0 start
            ;;
            
        status)
            show_status
            ;;
            
        logs)
            tail_logs
            ;;
            
        backend)
            if ! check_mongodb; then
                if ! start_mongodb; then
                    exit 1
                fi
            fi
            start_backend
            ;;
            
        frontend)
            start_frontend
            ;;
            
        mongodb)
            start_mongodb
            ;;
            
        help|--help|-h)
            show_help
            ;;
            
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Trap Ctrl+C and cleanup
trap 'echo ""; print_warning "Interrupted by user"; exit 130' INT

# Run main function
main "$@"
