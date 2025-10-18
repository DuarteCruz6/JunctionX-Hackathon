import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Depends, Header
from typing import Optional
import os
import logging

# Setup basic logging for auth
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK with service account credentials."""
    try:
        # Check if Firebase is already initialized
        if not firebase_admin._apps:
            # Use the service account key file
            cred_path = os.getenv("FIREBASE_CREDENTIALS", "junctionx-hackathon-firebase-adminsdk-fbsvc-b9ad2c64f0.json")
            
            if not os.path.exists(cred_path):
                raise FileNotFoundError(f"Firebase credentials file not found: {cred_path}")
            
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            
        return True
    except Exception as e:
        print(f"Firebase initialization failed: {e}")
        return False

# Initialize Firebase on module import
initialize_firebase()

def verify_firebase_token(authorization: Optional[str] = Header(None)) -> str:
    """
    Verify Firebase ID token and return user ID.
    
    Args:
        authorization: Authorization header containing "Bearer <token>"
    
    Returns:
        str: Firebase user ID
    
    Raises:
        HTTPException: If token is invalid or missing
    """
    
    if not authorization:
        logger.warning("Authorization header missing")
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )
    
    try:
        # Extract token from "Bearer <token>" format
        if not authorization.startswith("Bearer "):
            logger.warning("Invalid authorization format")
            raise HTTPException(
                status_code=401,
                detail="Invalid authorization format. Use 'Bearer <token>'"
            )
        
        token = authorization.split(" ")[1]
        
        # Verify the token
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token.get('uid')
        
        if not user_id:
            logger.warning("Invalid token: user ID not found")
            raise HTTPException(
                status_code=401,
                detail="Invalid token: user ID not found"
            )
            
        logger.info(f"User authenticated: {user_id}")
        return user_id
        
    except auth.InvalidIdTokenError:
        logger.warning("Invalid Firebase token")
        raise HTTPException(
            status_code=401,
            detail="Invalid Firebase token"
        )
    except auth.ExpiredIdTokenError:
        logger.warning("Firebase token expired")
        raise HTTPException(
            status_code=401,
            detail="Firebase token expired"
        )
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=401,
            detail=f"Token verification failed: {str(e)}"
        )

def get_firebase_user_info(user_id: str) -> dict:
    """
    Get user information from Firebase Auth.
    
    Args:
        user_id: Firebase user ID
    
    Returns:
        dict: User information
    """
    try:
        user = auth.get_user(user_id)
        logger.info(f"Fetched user info for: {user_id}")
        return {
            "uid": user.uid,
            "email": user.email,
            "display_name": user.display_name,
            "email_verified": user.email_verified,
            "disabled": user.disabled
        }
    except Exception as e:
        logger.error(f"User not found: {user_id} ({e})")
        raise HTTPException(
            status_code=404,
            detail=f"User not found: {str(e)}"
        )

# Optional dependency for getting user info
def get_current_user(user_id: str = Depends(verify_firebase_token)) -> dict:
    """
    Get current user information.
    
    Args:
        user_id: Firebase user ID from token verification
    
    Returns:
        dict: Current user information
    """
    return get_firebase_user_info(user_id)
