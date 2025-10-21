from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, elders, younger, chat, education, medications
from app.db import client
from app.routes import quiz
from app.session_manager import session_manager
from app.websocket_manager import connection_manager, ping_connections
from app.multi_user_db import db_manager
from app.rate_limiter import rate_limiter
from app.startup import startup_tasks
import asyncio
import json

app = FastAPI(title="RAMA AI Backend - Multi-User Support")

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize multi-user services on startup"""
    await startup_tasks()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",  # Development
        "http://localhost:3000",  # Alternative dev port
        "https://ramaai.in",      # Production domain
        "https://www.ramaai.in",  # Production domain with www
    ],
    allow_origin_regex=r"^https://[a-z0-9-]+\.vercel\.app$",  # Allow Vercel preview/prod subdomains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(elders.router)
app.include_router(younger.router)
app.include_router(chat.router)
app.include_router(education.router)
app.include_router(medications.router)
app.include_router(quiz.router, prefix="/quiz", tags=["Quiz"])

# WebSocket endpoint for real-time features
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await connection_manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "timestamp": message.get("timestamp")}))
            elif message.get("type") == "join_room":
                room = message.get("room")
                if room:
                    connection_manager.room_connections[room].add(websocket)
                    connection_manager.connection_metadata[websocket]["room"] = room
            elif message.get("type") == "leave_room":
                room = message.get("room")
                if room and room in connection_manager.room_connections:
                    connection_manager.room_connections[room].discard(websocket)
            
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)

# Multi-user management endpoints
@app.get("/admin/stats")
async def get_admin_stats():
    """Get comprehensive system statistics"""
    return {
        "session_stats": session_manager.get_all_user_stats(),
        "connection_stats": connection_manager.get_connection_stats(),
        "database_stats": db_manager.get_all_users_summary(),
        "rate_limit_stats": {
            "active_rate_limits": len(rate_limiter.user_request_counts),
            "ip_rate_limits": len(rate_limiter.ip_request_counts)
        }
    }

@app.get("/user/{user_id}/stats")
async def get_user_stats(user_id: str):
    """Get statistics for a specific user"""
    return {
        "user_stats": session_manager.get_user_stats(user_id),
        "database_stats": db_manager.get_user_statistics(user_id),
        "recent_activity": db_manager.get_user_recent_activity(user_id, 10)
    }

@app.get("/user/{user_id}/notifications")
async def get_user_notifications(user_id: str, unread_only: bool = False):
    """Get notifications for a user"""
    return db_manager.get_user_notifications(user_id, unread_only)

@app.post("/user/{user_id}/notifications/{notification_id}/read")
async def mark_notification_read(user_id: str, notification_id: str):
    """Mark a notification as read"""
    success = db_manager.mark_notification_read(notification_id, user_id)
    return {"success": success}

@app.get("/rate-limit/{user_id}/status")
async def get_rate_limit_status(user_id: str, endpoint_type: str = "general"):
    """Get rate limit status for a user"""
    return rate_limiter.get_user_rate_limit_status(user_id, endpoint_type)

@app.get("/")
def root():
    return {
        "message": "RAMA AI backend is running with multi-user support",
        "features": [
            "Real-time WebSocket connections",
            "User session management",
            "Rate limiting",
            "User analytics",
            "Notifications system",
            "Multi-user database operations"
        ],
        "websocket_url": "/ws/{user_id}",
        "admin_stats": "/admin/stats"
    }
