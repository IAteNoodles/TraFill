#!/usr/bin/env fish

# Setup script for Tracking System

echo "🚀 Setting up Tracking System..."

# Check if Python is installed
if not command -v python3 &> /dev/null
    echo "❌ Python3 is not installed. Please install Python 3.8 or higher."
    exit 1
end

echo "✅ Python found: "(python3 --version)

# Check if MongoDB is installed
if not command -v mongod &> /dev/null
    echo "⚠️  MongoDB is not installed. Please install MongoDB."
    echo "   Visit: https://docs.mongodb.com/manual/installation/"
    exit 1
end

echo "✅ MongoDB found"

# Create virtual environment
echo "📦 Creating virtual environment..."
cd backend
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate.fish

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if not test -f .env
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your MongoDB settings."
else
    echo "✅ .env file already exists"
end

echo ""
echo "✨ Setup complete!"
echo ""
echo "To start the application:"
echo "  1. Start MongoDB: mongod"
echo "  2. Activate venv: source backend/venv/bin/activate.fish"
echo "  3. Start backend: cd backend && python app.py"
echo "  4. Open frontend: Open frontend/index.html in your browser"
echo ""
echo "Happy tracking! 🎉"
