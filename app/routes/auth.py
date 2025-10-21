from fastapi import APIRouter, HTTPException, Depends, status, Body, Request
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

from app.db import users_collection
from app.models import UserCreate, UserLogin, UserProfileResponse
from app.security import hash_password, verify_password, create_access_token, decode_token
from app.session_manager import session_manager
from app.rate_limiter import rate_limiter
from app.multi_user_db import db_manager

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Partial update model: all fields optional for patch
class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

# Signup route with rate limiting
@router.post("/signup", status_code=201)
def signup(user: UserCreate, request: Request):
    # Apply rate limiting
    ip_address = request.client.host
    rate_limiter.check_rate_limit(None, "auth", ip_address)
    
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user.password)

    result = users_collection.insert_one({
        "username": user.username,
        "phone": user.phone,
        "email": user.email,
        "password": hashed,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "is_active": True
    })
    
    user_id = str(result.inserted_id)
    
    # Track user creation
    session_manager.track_feature_usage(user_id, "signup", {
        "email": user.email,
        "username": user.username
    })
    
    # Create welcome notification
    db_manager.create_user_notification(
        user_id=user_id,
        notification_type="welcome",
        title="Welcome to RAMA AI!",
        message="Your account has been created successfully. Start exploring our features!",
        data={"feature_tour": True}
    )

    return {"message": "User created successfully", "user_id": user_id}

# Login route with session tracking and rate limiting
@router.post("/login")
def login(user: UserLogin, request: Request):
    # Apply rate limiting
    ip_address = request.client.host
    rate_limiter.check_rate_limit(None, "auth", ip_address)
    
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(db_user["_id"])
    
    # Track user login
    session_manager.track_user_login(user_id)
    
    # Update last login time
    users_collection.update_one(
        {"_id": db_user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    token = create_access_token({
        "user_id": user_id,
        "email": db_user["email"]
    })

    return {
        "access_token": token, 
        "token_type": "bearer",
        "user_id": user_id,
        "user_stats": session_manager.get_user_stats(user_id)
    }

# Dependency to get current user from token
async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user = users_collection.find_one({"_id": ObjectId(payload["user_id"])})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    return user

# Get current logged in user profile
@router.get("/me", response_model=UserProfileResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "email": current_user["email"],
        "phone": current_user["phone"]
    }

# Update current logged in user profile (partial update)
@router.patch("/update", response_model=UserProfileResponse)
async def update_profile(
    updated_data: UserProfileUpdate = Body(...),
    current_user: dict = Depends(get_current_user)
):
    update_fields = updated_data.dict(exclude_unset=True)
    if not update_fields:
        raise HTTPException(status_code=400, detail="No update data provided")

    # Check if email is being updated and is unique
    if "email" in update_fields:
        existing_user = users_collection.find_one({"email": update_fields["email"]})
        if existing_user and existing_user["_id"] != current_user["_id"]:
            raise HTTPException(status_code=400, detail="Email already registered")

    # Perform the update
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_fields}
    )

    # Fetch updated user from DB
    updated_user = users_collection.find_one({"_id": current_user["_id"]})

    return {
        "username": updated_user["username"],
        "email": updated_user["email"],
        "phone": updated_user["phone"]
    }
