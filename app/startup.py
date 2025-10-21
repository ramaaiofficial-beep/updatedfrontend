# Startup script for multi-user backend
import asyncio
from app.session_manager import session_manager
from app.websocket_manager import ping_connections
from app.multi_user_db import db_manager

async def startup_tasks():
    """Initialize background tasks for multi-user support"""
    print("🚀 Starting multi-user backend services...")
    
    # Start WebSocket ping task
    asyncio.create_task(ping_connections())
    print("✅ WebSocket ping service started")
    
    # Cleanup expired data
    db_manager.cleanup_expired_data()
    print("✅ Database cleanup completed")
    
    # Cleanup inactive sessions
    session_manager.cleanup_inactive_sessions()
    print("✅ Session cleanup completed")
    
    print("🎉 Multi-user backend services initialized successfully!")

def run_startup():
    """Run startup tasks"""
    asyncio.run(startup_tasks())
