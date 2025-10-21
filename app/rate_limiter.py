# Rate Limiting System
from fastapi import HTTPException, Request
from typing import Dict, List
import time
from collections import defaultdict

class RateLimiter:
    """Rate limiting system to prevent abuse"""
    
    def __init__(self):
        self.user_request_counts: Dict[str, List[float]] = defaultdict(list)
        self.ip_request_counts: Dict[str, List[float]] = defaultdict(list)
        
        # Rate limits (requests per window)
        self.limits = {
            "auth": {"requests": 10, "window": 300},      # 10 requests per 5 minutes
            "chat": {"requests": 50, "window": 3600},      # 50 requests per hour
            "quiz": {"requests": 20, "window": 3600},     # 20 requests per hour
            "general": {"requests": 100, "window": 3600},  # 100 requests per hour
        }
    
    def check_rate_limit(self, user_id: str, endpoint_type: str, ip_address: str = None):
        """Check if user/IP has exceeded rate limits"""
        current_time = time.time()
        limits = self.limits.get(endpoint_type, self.limits["general"])
        
        # Check user-based rate limit
        if user_id:
            self._cleanup_old_requests(self.user_request_counts[user_id], current_time, limits["window"])
            
            if len(self.user_request_counts[user_id]) >= limits["requests"]:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded for user. Maximum {limits['requests']} requests per {limits['window']} seconds."
                )
            
            self.user_request_counts[user_id].append(current_time)
        
        # Check IP-based rate limit
        if ip_address:
            self._cleanup_old_requests(self.ip_request_counts[ip_address], current_time, limits["window"])
            
            if len(self.ip_request_counts[ip_address]) >= limits["requests"]:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded for IP address. Maximum {limits['requests']} requests per {limits['window']} seconds."
                )
            
            self.ip_request_counts[ip_address].append(current_time)
    
    def _cleanup_old_requests(self, request_times: List[float], current_time: float, window: int):
        """Remove requests outside the time window"""
        cutoff_time = current_time - window
        # Remove old requests
        while request_times and request_times[0] < cutoff_time:
            request_times.pop(0)
    
    def get_user_rate_limit_status(self, user_id: str, endpoint_type: str) -> Dict:
        """Get current rate limit status for a user"""
        current_time = time.time()
        limits = self.limits.get(endpoint_type, self.limits["general"])
        
        self._cleanup_old_requests(self.user_request_counts[user_id], current_time, limits["window"])
        
        return {
            "current_requests": len(self.user_request_counts[user_id]),
            "max_requests": limits["requests"],
            "window_seconds": limits["window"],
            "remaining_requests": limits["requests"] - len(self.user_request_counts[user_id]),
            "reset_time": current_time + limits["window"]
        }

# Global rate limiter instance
rate_limiter = RateLimiter()

# Rate limiting decorator
def rate_limit(endpoint_type: str = "general"):
    """Decorator to apply rate limiting to endpoints"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract user_id and request from function arguments
            user_id = None
            request = None
            
            for arg in args:
                if hasattr(arg, 'user_id'):
                    user_id = arg.user_id
                elif isinstance(arg, Request):
                    request = arg
            
            # Get IP address from request
            ip_address = None
            if request:
                ip_address = request.client.host
            
            # Check rate limit
            rate_limiter.check_rate_limit(user_id, endpoint_type, ip_address)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
