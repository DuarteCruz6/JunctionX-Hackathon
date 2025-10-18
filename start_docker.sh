#!/bin/bash

# Forest Guardian Docker Startup Script
# This script helps start the services with Docker Compose

echo "🌲 Starting Forest Guardian with Docker Compose..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Creating a temporary .env file for Docker testing..."
    
    cat > .env << EOF
# Temporary environment variables for Docker testing
AWS_ACCESS_KEY_ID=dummy_key
AWS_SECRET_ACCESS_KEY=dummy_secret
AWS_S3_BUCKET=dummy_bucket
HF_API_TOKEN=dummy_token
HF_MODEL_NAME=HUGGINGFACE_MODEL_ID
FIREBASE_CREDENTIALS=dummy_creds
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
EOF
    
    echo "✅ Created temporary .env file"
    echo "⚠️  Remember to update .env with real values for production!"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Docker Compose not found. Please install Docker Compose."
    exit 1
fi

echo "🐳 Building and starting services..."
echo ""

# Build and start services
docker-compose up --build

echo ""
echo "🛑 Services stopped"
