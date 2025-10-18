#!/bin/bash

echo "🌲 Setting up Forest Guardian Project..."

# Create .env file for backend
echo "📝 Creating .env file template..."
cat > backend/.env << 'EOF'
# AWS Configuration
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET=YOUR_S3_BUCKET_NAME

# Hugging Face API
HF_API_TOKEN=YOUR_HUGGING_FACE_API_TOKEN

# Firebase Configuration
FIREBASE_CREDENTIALS=serviceAccountKey.json

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Backend Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
EOF

echo "✅ .env file created in backend directory"
echo "⚠️  Please update the .env file with your actual API keys and credentials"


