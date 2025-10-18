#!/bin/bash

# Forest Guardian Backend Startup Script
# This script helps start all the necessary services for the hackathon

echo "🌲 Starting Forest Guardian Backend Services..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with your configuration."
    echo "You can copy .env.example as a template."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if Redis is running
echo "🔍 Checking Redis connection..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis is not running. Please start Redis server:"
    echo "   redis-server"
    echo "   Or run: docker-compose up redis"
    exit 1
fi

# Check Firebase credentials
if [ ! -f "$FIREBASE_CREDENTIALS" ]; then
    echo "❌ Firebase credentials file not found: $FIREBASE_CREDENTIALS"
    exit 1
fi

echo "✅ All checks passed!"
echo ""
echo "🚀 Starting services..."
echo ""

# Start Celery worker in background
echo "🔄 Starting Celery worker..."
celery -A core.tasks.celery_tasks.celery_app worker --loglevel=info &
CELERY_PID=$!

# Wait a moment for Celery to start
sleep 3

# Start FastAPI server
echo "🌐 Starting FastAPI server..."
echo "   API will be available at: http://localhost:8000"
echo "   API docs at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start the FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Cleanup on exit
echo ""
echo "🛑 Shutting down services..."
kill $CELERY_PID 2>/dev/null
echo "✅ All services stopped"
