# WebSocket Support for Real-time Features
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
import json
import asyncio
from datetime import datetime

class ConnectionManager:
    """Manages WebSocket connections for real-time features"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, WebSocket] = {}
        self.room_connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        self.connection_metadata: Dict[WebSocket, Dict] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str, room: str = None):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_connections[user_id] = websocket
        
        # Store connection metadata
        self.connection_metadata[websocket] = {
            "user_id": user_id,
            "room": room,
            "connected_at": datetime.utcnow(),
            "last_ping": datetime.utcnow()
        }
        
        # Add to room if specified
        if room:
            self.room_connections[room].add(websocket)
        
        # Send welcome message
        await self.send_personal_message({
            "type": "connection_established",
            "message": "Connected successfully",
            "timestamp": datetime.utcnow().isoformat()
        }, user_id)
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Get connection metadata
        metadata = self.connection_metadata.get(websocket, {})
        user_id = metadata.get("user_id")
        room = metadata.get("room")
        
        # Remove from user connections
        if user_id and user_id in self.user_connections:
            del self.user_connections[user_id]
        
        # Remove from room connections
        if room and room in self.room_connections:
            self.room_connections[room].discard(websocket)
            if not self.room_connections[room]:
                del self.room_connections[room]
        
        # Remove metadata
        if websocket in self.connection_metadata:
            del self.connection_metadata[websocket]
    
    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to a specific user"""
        if user_id in self.user_connections:
            websocket = self.user_connections[user_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                print(f"Error sending message to user {user_id}: {e}")
                self.disconnect(websocket)
    
    async def send_room_message(self, message: dict, room: str):
        """Send a message to all users in a room"""
        if room in self.room_connections:
            disconnected = []
            for websocket in self.room_connections[room]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    print(f"Error sending room message: {e}")
                    disconnected.append(websocket)
            
            # Clean up disconnected connections
            for websocket in disconnected:
                self.disconnect(websocket)
    
    async def broadcast(self, message: dict):
        """Send a message to all connected users"""
        disconnected = []
        for websocket in self.active_connections:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                print(f"Error broadcasting message: {e}")
                disconnected.append(websocket)
        
        # Clean up disconnected connections
        for websocket in disconnected:
            self.disconnect(websocket)
    
    async def send_notification(self, user_id: str, notification_type: str, data: dict):
        """Send a notification to a specific user"""
        message = {
            "type": "notification",
            "notification_type": notification_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_personal_message(message, user_id)
    
    def get_connection_stats(self) -> dict:
        """Get statistics about current connections"""
        return {
            "total_connections": len(self.active_connections),
            "unique_users": len(self.user_connections),
            "rooms": len(self.room_connections),
            "room_details": {
                room: len(connections) 
                for room, connections in self.room_connections.items()
            }
        }
    
    async def ping_all_connections(self):
        """Send ping to all connections to check if they're alive"""
        ping_message = {
            "type": "ping",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        disconnected = []
        for websocket in self.active_connections:
            try:
                await websocket.send_text(json.dumps(ping_message))
            except Exception as e:
                print(f"Ping failed for connection: {e}")
                disconnected.append(websocket)
        
        # Clean up disconnected connections
        for websocket in disconnected:
            self.disconnect(websocket)

# Global connection manager instance
connection_manager = ConnectionManager()

# Background task to ping connections
async def ping_connections():
    """Background task to ping all connections every 30 seconds"""
    while True:
        await asyncio.sleep(30)
        await connection_manager.ping_all_connections()
