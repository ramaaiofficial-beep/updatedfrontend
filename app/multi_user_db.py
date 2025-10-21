# Enhanced Database Utilities for Multi-User Access
from pymongo import ASCENDING, DESCENDING
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from bson import ObjectId
from app.db import db

class MultiUserDBManager:
    """Enhanced database manager for multi-user operations"""
    
    def __init__(self):
        self.collections = {
            'users': db["users"],
            'elders': db["elders"],
            'younger': db["younger"],
            'chat_history': db["chat_history"],
            'quiz_results': db["quiz_results"],
            'medication_reminders': db["medication_reminders"],
            'user_analytics': db["user_analytics"],
            'notifications': db["notifications"]
        }
    
    def get_user_data(self, user_id: str, collection_name: str, limit: int = None) -> List[Dict]:
        """Get all data for a specific user from a collection"""
        if collection_name not in self.collections:
            return []
        
        collection = self.collections[collection_name]
        query = {"user_id": user_id}
        
        if limit:
            return list(collection.find(query).sort("created_at", DESCENDING).limit(limit))
        else:
            return list(collection.find(query).sort("created_at", DESCENDING))
    
    def get_user_recent_activity(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent activity for a user across all collections"""
        collections_to_check = ['chat_history', 'quiz_results', 'medication_reminders', 'notifications']
        recent_activity = []
        
        for coll_name in collections_to_check:
            if coll_name in self.collections:
                collection = self.collections[coll_name]
                user_data = collection.find(
                    {"user_id": user_id}
                ).sort("created_at", DESCENDING).limit(limit)
                recent_activity.extend(list(user_data))
        
        # Sort by creation date
        return sorted(recent_activity, key=lambda x: x.get('created_at', datetime.min), reverse=True)[:limit]
    
    def create_user_notification(self, user_id: str, notification_type: str, title: str, message: str, data: Dict = None):
        """Create a notification for a user"""
        notification = {
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "data": data or {},
            "is_read": False,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=30)  # Notifications expire after 30 days
        }
        
        result = self.collections['notifications'].insert_one(notification)
        return result.inserted_id
    
    def get_user_notifications(self, user_id: str, unread_only: bool = False) -> List[Dict]:
        """Get notifications for a user"""
        query = {"user_id": user_id}
        if unread_only:
            query["is_read"] = False
        
        return list(self.collections['notifications'].find(query).sort("created_at", DESCENDING))
    
    def mark_notification_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read"""
        result = self.collections['notifications'].update_one(
            {"_id": ObjectId(notification_id), "user_id": user_id},
            {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
        )
        return result.modified_count > 0
    
    def get_user_statistics(self, user_id: str) -> Dict:
        """Get comprehensive statistics for a user"""
        stats = {
            "user_id": user_id,
            "total_chats": self.collections['chat_history'].count_documents({"user_id": user_id}),
            "total_quizzes": self.collections['quiz_results'].count_documents({"user_id": user_id}),
            "total_medications": self.collections['medication_reminders'].count_documents({"user_id": user_id}),
            "unread_notifications": self.collections['notifications'].count_documents({"user_id": user_id, "is_read": False}),
            "last_activity": None
        }
        
        # Get last activity
        recent_activity = self.get_user_recent_activity(user_id, 1)
        if recent_activity:
            stats["last_activity"] = recent_activity[0].get("created_at")
        
        return stats
    
    def get_all_users_summary(self) -> Dict:
        """Get summary statistics for all users"""
        return {
            "total_users": self.collections['users'].count_documents({}),
            "total_chats": self.collections['chat_history'].count_documents({}),
            "total_quizzes": self.collections['quiz_results'].count_documents({}),
            "total_medications": self.collections['medication_reminders'].count_documents({}),
            "total_notifications": self.collections['notifications'].count_documents({}),
            "unread_notifications": self.collections['notifications'].count_documents({"is_read": False})
        }
    
    def cleanup_expired_data(self):
        """Clean up expired notifications and old data"""
        # Remove expired notifications
        expired_cutoff = datetime.utcnow()
        self.collections['notifications'].delete_many({"expires_at": {"$lt": expired_cutoff}})
        
        # Remove old chat history (older than 1 year)
        old_chat_cutoff = datetime.utcnow() - timedelta(days=365)
        self.collections['chat_history'].delete_many({"created_at": {"$lt": old_chat_cutoff}})
        
        # Remove old analytics data (older than 6 months)
        old_analytics_cutoff = datetime.utcnow() - timedelta(days=180)
        self.collections['user_analytics'].delete_many({"created_at": {"$lt": old_analytics_cutoff}})
    
    def search_user_data(self, user_id: str, search_term: str, collections: List[str] = None) -> List[Dict]:
        """Search across user's data"""
        if collections is None:
            collections = ['chat_history', 'quiz_results', 'medication_reminders']
        
        results = []
        search_regex = {"$regex": search_term, "$options": "i"}
        
        for coll_name in collections:
            if coll_name in self.collections:
                collection = self.collections[coll_name]
                search_query = {
                    "user_id": user_id,
                    "$or": [
                        {"message": search_regex},
                        {"title": search_regex},
                        {"content": search_regex},
                        {"medication_name": search_regex}
                    ]
                }
                
                search_results = list(collection.find(search_query).limit(10))
                for result in search_results:
                    result["collection"] = coll_name
                    results.append(result)
        
        return sorted(results, key=lambda x: x.get("created_at", datetime.min), reverse=True)

# Global database manager instance
db_manager = MultiUserDBManager()
