"""
ORBIT Notification Routes

Manages notification preferences and delivery.
Philosophy: Respect attention - notifications should be rare and valuable.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import structlog

from app.api.deps import get_db, get_current_user
from app.models.models import User
from app.services.notification_service import notification_service

logger = structlog.get_logger()

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ==================== Schemas ====================

class NotificationPreferences(BaseModel):
    """User notification preferences."""
    quiet_hours_start: Optional[int] = None  # Hour (0-23)
    quiet_hours_end: Optional[int] = None
    notification_times: Optional[List[int]] = None  # Preferred hours
    allow_insights: bool = True
    allow_reminders: bool = True
    allow_celebrations: bool = True
    urgent_only_during_focus: bool = True


class PendingNotification(BaseModel):
    """A pending notification waiting for delivery."""
    title: str
    message: str
    type: str
    priority: str
    queued_at: str


# ==================== Endpoints ====================

@router.get("/pending")
async def get_pending_notifications(
    limit: int = 10,
    current_user: User = Depends(get_current_user)
) -> List[PendingNotification]:
    """
    Get pending notifications that were queued during focus/quiet hours.
    
    These are notifications that ORBIT decided not to interrupt you with.
    They're delivered here when you're ready.
    """
    pending = await notification_service.get_pending_notifications(
        current_user.id,
        limit=limit
    )
    
    return [
        PendingNotification(
            title=n.get("title", ""),
            message=n.get("message", ""),
            type=n.get("type", "info"),
            priority=n.get("priority", "normal"),
            queued_at=n.get("queued_at", "")
        )
        for n in pending
    ]


@router.post("/deliver-pending")
async def deliver_pending_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Deliver all pending notifications now.
    
    Call this when user is ready to receive batched updates.
    """
    delivered = await notification_service.deliver_pending(
        db, 
        current_user.id
    )
    
    return {
        "delivered": delivered,
        "message": f"Delivered {delivered} pending notification(s)"
    }


@router.post("/mark-read/{notification_id}")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
) -> dict:
    """Mark a notification as read."""
    # In practice, this would update Redis/DB
    return {"status": "ok", "notification_id": notification_id}


@router.delete("/clear")
async def clear_pending_notifications(
    current_user: User = Depends(get_current_user)
) -> dict:
    """Clear all pending notifications."""
    from app.core.redis import redis_client
    
    key = f"pending_notifications:{current_user.id}"
    await redis_client.delete(key)
    
    return {"status": "ok", "message": "Pending notifications cleared"}


@router.get("/preferences")
async def get_notification_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> NotificationPreferences:
    """Get user's notification preferences."""
    from sqlalchemy import select
    from app.models.models import CognitiveProfile
    
    result = await db.execute(
        select(CognitiveProfile).where(
            CognitiveProfile.user_id == current_user.id
        )
    )
    profile = result.scalar_one_or_none()
    
    if not profile or not profile.preferences:
        return NotificationPreferences()
    
    prefs = profile.preferences
    
    return NotificationPreferences(
        quiet_hours_start=prefs.get("quiet_hours_start"),
        quiet_hours_end=prefs.get("quiet_hours_end"),
        notification_times=prefs.get("notification_times"),
        allow_insights=prefs.get("allow_insights", True),
        allow_reminders=prefs.get("allow_reminders", True),
        allow_celebrations=prefs.get("allow_celebrations", True),
        urgent_only_during_focus=prefs.get("urgent_only_during_focus", True),
    )


@router.put("/preferences")
async def update_notification_preferences(
    preferences: NotificationPreferences,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Update notification preferences.
    
    Philosophy: Let users control when they want to be interrupted.
    """
    from sqlalchemy import select
    from app.models.models import CognitiveProfile
    
    result = await db.execute(
        select(CognitiveProfile).where(
            CognitiveProfile.user_id == current_user.id
        )
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Merge with existing preferences
    existing = profile.preferences or {}
    existing.update({
        "quiet_hours_start": preferences.quiet_hours_start,
        "quiet_hours_end": preferences.quiet_hours_end,
        "notification_times": preferences.notification_times,
        "allow_insights": preferences.allow_insights,
        "allow_reminders": preferences.allow_reminders,
        "allow_celebrations": preferences.allow_celebrations,
        "urgent_only_during_focus": preferences.urgent_only_during_focus,
    })
    
    profile.preferences = existing
    await db.commit()
    
    logger.info(
        "Notification preferences updated",
        user_id=str(current_user.id)
    )
    
    return {"status": "ok", "message": "Preferences updated"}


@router.post("/test")
async def send_test_notification(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Send a test notification.
    
    Useful for verifying notification setup works.
    """
    from app.models.models import NotificationPriority
    
    sent = await notification_service.send_notification(
        db=db,
        user_id=current_user.id,
        title="🧪 Test Notification",
        message="If you see this, notifications are working!",
        notification_type="test",
        priority=NotificationPriority.NORMAL,
        force=True  # Bypass attention protection for test
    )
    
    return {
        "sent": sent,
        "message": "Test notification sent" if sent else "Notification queued"
    }
