# User Session Management and Analytics
from datetime import datetime, timedelta
from typing import Dict, Set, Optional, List
from collections import defaultdict
import time
import json

class UserSessionManager:
    """Manages user sessions and tracks activity"""
    
    def __init__(self):
        self.active_users: Dict[str, datetime] = {}
        self.user_sessions: Set[str] = set()
        self.user_activity: Dict[str, List[Dict]] = defaultdict(list)
        self.user_stats: Dict[str, Dict] = defaultdict(lambda: {
            'login_count': 0,
            'last_login': None,
            'features_used': set(),
            'total_time_spent': 0,
            'last_activity': None
        })
    
    def track_user_login(self, user_id: str):
        """Track when a user logs in"""
        self.active_users[user_id] = datetime.utcnow()
        self.user_sessions.add(user_id)
        self.user_stats[user_id]['login_count'] += 1
        self.user_stats[user_id]['last_login'] = datetime.utcnow()
        self.user_stats[user_id]['last_activity'] = datetime.utcnow()
        
        # Log the activity
        self.log_activity(user_id, "login", {"timestamp": datetime.utcnow().isoformat()})
    
    def track_user_logout(self, user_id: str):
        """Track when a user logs out"""
        if user_id in self.active_users:
            session_duration = datetime.utcnow() - self.active_users[user_id]
            self.user_stats[user_id]['total_time_spent'] += session_duration.total_seconds()
            del self.active_users[user_id]
            self.user_sessions.discard(user_id)
            
            # Log the activity
            self.log_activity(user_id, "logout", {
                "session_duration": session_duration.total_seconds(),
                "timestamp": datetime.utcnow().isoformat()
            })
    
    def track_feature_usage(self, user_id: str, feature: str, metadata: Dict = None):
        """Track when a user uses a specific feature"""
        self.user_stats[user_id]['features_used'].add(feature)
        self.user_stats[user_id]['last_activity'] = datetime.utcnow()
        
        # Log the activity
        self.log_activity(user_id, f"feature_used_{feature}", {
            "feature": feature,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def log_activity(self, user_id: str, activity_type: str, data: Dict):
        """Log user activity for analytics"""
        activity = {
            "user_id": user_id,
            "activity_type": activity_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.user_activity[user_id].append(activity)
        
        # Keep only last 100 activities per user
        if len(self.user_activity[user_id]) > 100:
            self.user_activity[user_id] = self.user_activity[user_id][-100:]
    
    def cleanup_inactive_sessions(self):
        """Remove sessions older than 24 hours"""
        cutoff = datetime.utcnow() - timedelta(hours=24)
        inactive_users = [
            uid for uid, last_seen in self.active_users.items() 
            if last_seen < cutoff
        ]
        
        for uid in inactive_users:
            self.track_user_logout(uid)
    
    def get_active_users_count(self) -> int:
        """Get count of currently active users"""
        return len(self.active_users)
    
    def get_user_stats(self, user_id: str) -> Dict:
        """Get statistics for a specific user"""
        stats = self.user_stats[user_id].copy()
        stats['features_used'] = list(stats['features_used'])
        stats['is_online'] = user_id in self.active_users
        stats['recent_activities'] = self.user_activity[user_id][-10:]  # Last 10 activities
        return stats
    
    def get_all_user_stats(self) -> Dict:
        """Get statistics for all users"""
        return {
            "total_users": len(self.user_stats),
            "active_users": len(self.active_users),
            "user_stats": dict(self.user_stats)
        }

# Global session manager instance
session_manager = UserSessionManager()
