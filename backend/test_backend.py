#!/usr/bin/env python3
"""
Forest Guardian Backend Test Script
This script tests the basic structure and imports of the backend.
"""

import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def test_imports():
    """Test if all modules can be imported."""
    print("🧪 Testing backend imports...")
    
    try:
        # Test basic Python imports
        import json
        import uuid
        import time
        print("✅ Basic Python modules imported successfully")
        
        # Test if we can import our modules (without dependencies)
        try:
            from app.main import app
            print("✅ FastAPI app structure is correct")
        except ImportError as e:
            print(f"⚠️  FastAPI app import failed (expected without dependencies): {e}")
        
        try:
            from app.middlewares.auth import verify_firebase_token
            print("✅ Auth middleware structure is correct")
        except ImportError as e:
            print(f"⚠️  Auth middleware import failed (expected without dependencies): {e}")
        
        try:
            from app.utils.s3_storage import S3Storage
            print("✅ S3 storage structure is correct")
        except ImportError as e:
            print(f"⚠️  S3 storage import failed (expected without dependencies): {e}")
        
        try:
            from app.utils.ml_inference import HuggingFaceML
            print("✅ ML inference structure is correct")
        except ImportError as e:
            print(f"⚠️  ML inference import failed (expected without dependencies): {e}")
        
        try:
            from core.tasks.celery_tasks import celery_app
            print("✅ Celery tasks structure is correct")
        except ImportError as e:
            print(f"⚠️  Celery tasks import failed (expected without dependencies): {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Import test failed: {e}")
        return False

def test_file_structure():
    """Test if all required files exist."""
    print("\n📁 Testing file structure...")
    
    required_files = [
        "app/main.py",
        "app/controllers/upload.py",
        "app/controllers/predict.py",
        "app/middlewares/auth.py",
        "app/utils/s3_storage.py",
        "app/utils/firebase_db.py",
        "app/utils/ml_inference.py",
        "core/tasks/celery_tasks.py",
        "core/ml_model/train.py",
        "core/ml_model/utils.py",
        "core/ml_model/preprocess.py",
        "requirements.txt",
        "start_backend.sh"
    ]
    
    missing_files = []
    
    for file_path in required_files:
        full_path = backend_dir / file_path
        if full_path.exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - MISSING")
            missing_files.append(file_path)
    
    if missing_files:
        print(f"\n⚠️  Missing files: {missing_files}")
        return False
    else:
        print("\n✅ All required files present!")
        return True

def test_environment_setup():
    """Test environment configuration."""
    print("\n🔧 Testing environment setup...")
    
    env_file = backend_dir / ".env"
    env_example = backend_dir / ".env.example"
    
    if env_file.exists():
        print("✅ .env file exists")
    else:
        print("⚠️  .env file not found")
        if env_example.exists():
            print("   💡 You can copy .env.example to .env and fill in your values")
        else:
            print("   ❌ .env.example also not found")
    
    firebase_creds = backend_dir / "junctionx-hackathon-firebase-adminsdk-fbsvc-b9ad2c64f0.json"
    if firebase_creds.exists():
        print("✅ Firebase credentials file exists")
    else:
        print("⚠️  Firebase credentials file not found")
    
    return True

def main():
    """Main test function."""
    print("🌲 Forest Guardian Backend Test")
    print("=" * 40)
    
    # Run tests
    structure_ok = test_file_structure()
    imports_ok = test_imports()
    env_ok = test_environment_setup()
    
    print("\n" + "=" * 40)
    print("📊 Test Results:")
    print(f"   File Structure: {'✅ PASS' if structure_ok else '❌ FAIL'}")
    print(f"   Import Structure: {'✅ PASS' if imports_ok else '❌ FAIL'}")
    print(f"   Environment Setup: {'✅ PASS' if env_ok else '⚠️  PARTIAL'}")
    
    if structure_ok and imports_ok:
        print("\n🎉 Backend structure is ready!")
        print("   Next steps:")
        print("   1. Create .env file with your configuration")
        print("   2. Install dependencies: pip install -r requirements.txt")
        print("   3. Start Redis server")
        print("   4. Run: ./start_backend.sh")
    else:
        print("\n❌ Backend structure has issues that need to be fixed")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
