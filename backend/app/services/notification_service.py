"""
ORBIT Notification Service

Handles intelligent notification delivery respecting user's attention.
ORBIT never spams - notifications are rare, calm, and valuable.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from uuid import UUID
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.models import (
    User,
    CognitiveProfile,
    Intent,
    Task,
    NotificationPriority,
)
from app.core.redis import redis_client

logger = structlog.get_logger()


class NotificationService:
    """
    Intelligent notification system that respects attention.
    
    Philosophy:
    - Silence is golden - prefer no notification over noise
    - Context matters - check if user is focused before interrupting
    - Batch when possible - combine related updates
    - Urgent only when truly urgent
    """

    # Minimum time between non-urgent notifications (minutes)
    MIN_NOTIFICATION_GAP = 30
    
    # Maximum notifications per hour
    MAX_HOURLY_NOTIFICATIONS = 3

    async def should_notify(
        self,
        db: AsyncSession,
        user_id: UUID,
        priority: NotificationPriority = NotificationPriority.LOW
    ) -> bool:
        """
        Determine if we should send a notification right now.
        
        Returns False if:
        - User is in focus mode
        - User is in quiet hours
        - Too many recent notifications
        - Priority doesn't warrant interruption
        """
        # Get user's cognitive profile
        profile = await db.execute(
            select(CognitiveProfile).where(
                CognitiveProfile.user_id == user_id
            )
        )
        profile = profile.scalar_one_or_none()
        
        if not profile:
            return priority == NotificationPriority.URGENT
        
        # Check focus mode
        if await self._is_in_focus_mode(user_id):
            # Only urgent notifications break focus
            return priority == NotificationPriority.URGENT
        
        # Check quiet hours
        if self._is_quiet_hours(profile):
            return priority == NotificationPriority.URGENT
        
        # Check notification rate
        if await self._exceeded_rate_limit(user_id):
            return priority == NotificationPriority.URGENT
        
        # Low priority notifications have stricter criteria
        if priority == NotificationPriority.LOW:
            return await self._is_good_time_for_low_priority(user_id, profile)
        
        return True

    async def send_notification(
        self,
        db: AsyncSession,
        user_id: UUID,
        title: str,
        message: str,
        notification_type: str = "info",
        priority: NotificationPriority = NotificationPriority.NORMAL,
        data: Optional[Dict[str, Any]] = None,
        force: bool = False
    ) -> bool:
        """
        Send a notification if appropriate.
        
        Args:
            db: Database session
            user_id: User to notify
            title: Notification title
            message: Notification body
            notification_type: Type (info, reminder, insight, warning)
            priority: Notification priority level
            data: Additional data to include
            force: Bypass attention checks (use sparingly)
            
        Returns:
            True if notification was sent
        """
        if not force and not await self.should_notify(db, user_id, priority):
            logger.info(
                "Notification suppressed",
                user_id=str(user_id),
                title=title,
                reason="attention_protection"
            )
            # Queue for later delivery
            await self._queue_notification(
                user_id, title, message, notification_type, priority, data
            )
            return False
        
        notification = {
            "id": str(UUID(int=0)),  # Will be replaced
            "user_id": str(user_id),
            "title": title,
            "message": message,
            "type": notification_type,
            "priority": priority.value,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "read": False
        }
        
        # Publish to real-time channel
        await redis_client.publish(
            f"notifications:{user_id}",
            notification
        )
        
        # Track notification for rate limiting
        await self._record_notification(user_id)
        
        logger.info(
            "Notification sent",
            user_id=str(user_id),
            title=title,
            type=notification_type
        )
        
        return True

    async def send_insight(
        self,
        db: AsyncSession,
        user_id: UUID,
        insight: str,
        insight_type: str = "pattern"
    ) -> bool:
        """Send a cognitive insight notification."""
        return await self.send_notification(
            db=db,
            user_id=user_id,
            title="💡 Insight",
            message=insight,
            notification_type="insight",
            priority=NotificationPriority.LOW,
            data={"insight_type": insight_type}
        )

    async def send_gentle_reminder(
        self,
        db: AsyncSession,
        user_id: UUID,
        task_title: str,
        reason: str
    ) -> bool:
        """Send a gentle task reminder."""
        return await self.send_notification(
            db=db,
            user_id=user_id,
            title=f"Gentle reminder: {task_title}",
            message=reason,
            notification_type="reminder",
            priority=NotificationPriority.NORMAL,
            data={"task_title": task_title}
        )

    async def send_overwhelm_alert(
        self,
        db: AsyncSession,
        user_id: UUID,
        suggestion: str
    ) -> bool:
        """Alert user they may be overwhelmed (with care)."""
        return await self.send_notification(
            db=db,
            user_id=user_id,
            title="🌿 Take a breath",
            message=suggestion,
            notification_type="wellness",
            priority=NotificationPriority.HIGH,
            force=True  # This is important enough to break through
        )

    async def send_completion_celebration(
        self,
        db: AsyncSession,
        user_id: UUID,
        task_title: str,
        streak: Optional[int] = None
    ) -> bool:
        """Celebrate task completion (briefly, not overwhelming)."""
        message = f"Completed: {task_title}"
        if streak and streak > 3:
            message += f" • {streak} day streak! 🔥"
        
        return await self.send_notification(
            db=db,
            user_id=user_id,
            title="✓",  # Minimal, not loud
            message=message,
            notification_type="completion",
            priority=NotificationPriority.LOW,
            data={"streak": streak}
        )

    async def get_pending_notifications(
        self,
        user_id: UUID,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get queued notifications for when user is available."""
        key = f"pending_notifications:{user_id}"
        pending = await redis_client.lrange(key, 0, limit - 1)
        return pending or []

    async def deliver_pending(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> int:
        """Deliver pending notifications. Returns count delivered."""
        pending = await self.get_pending_notifications(user_id)
        
        if not pending:
            return 0
        
        # Batch similar notifications
        batched = self._batch_notifications(pending)
        
        delivered = 0
        for notification in batched:
            if await self.send_notification(
                db=db,
                user_id=user_id,
                title=notification["title"],
                message=notification["message"],
                notification_type=notification["type"],
                priority=NotificationPriority(notification["priority"])
            ):
                delivered += 1
        
        # Clear delivered notifications
        key = f"pending_notifications:{user_id}"
        await redis_client.delete(key)
        
        return delivered

    # Private helper methods

    async def _is_in_focus_mode(self, user_id: UUID) -> bool:
        """Check if user is currently in focus mode."""
        focus_key = f"focus_mode:{user_id}"
        return await redis_client.exists(focus_key)

    def _is_quiet_hours(self, profile: CognitiveProfile) -> bool:
        """Check if current time is in user's quiet hours."""
        if not profile.preferences:
            return False
        
        quiet_start = profile.preferences.get("quiet_hours_start")
        quiet_end = profile.preferences.get("quiet_hours_end")
        
        if not quiet_start or not quiet_end:
            return False
        
        now = datetime.now(timezone.utc).hour
        
        # Handle overnight quiet hours (e.g., 22:00 - 07:00)
        if quiet_start > quiet_end:
            return now >= quiet_start or now < quiet_end
        else:
            return quiet_start <= now < quiet_end

    async def _exceeded_rate_limit(self, user_id: UUID) -> bool:
        """Check if we've sent too many notifications recently."""
        key = f"notification_count:{user_id}"
        count = await redis_client.get(key)
        return int(count or 0) >= self.MAX_HOURLY_NOTIFICATIONS

    async def _is_good_time_for_low_priority(
        self,
        user_id: UUID,
        profile: CognitiveProfile
    ) -> bool:
        """Determine if now is a good time for low-priority notifications."""
        # Check time since last notification
        last_key = f"last_notification:{user_id}"
        last_time = await redis_client.get(last_key)
        
        if last_time:
            last_dt = datetime.fromisoformat(last_time)
            if datetime.now(timezone.utc) - last_dt < timedelta(
                minutes=self.MIN_NOTIFICATION_GAP
            ):
                return False
        
        # Check if user has preferred notification times
        if profile.preferences:
            preferred_times = profile.preferences.get("notification_times", [])
            if preferred_times:
                current_hour = datetime.now(timezone.utc).hour
                return current_hour in preferred_times
        
        return True

    async def _record_notification(self, user_id: UUID) -> None:
        """Record that a notification was sent for rate limiting."""
        # Increment hourly counter
        count_key = f"notification_count:{user_id}"
        await redis_client.incr(count_key)
        await redis_client.expire(count_key, 3600)  # 1 hour
        
        # Record timestamp
        last_key = f"last_notification:{user_id}"
        await redis_client.set(
            last_key,
            datetime.now(timezone.utc).isoformat(),
            ex=86400  # 24 hours
        )

    async def _queue_notification(
        self,
        user_id: UUID,
        title: str,
        message: str,
        notification_type: str,
        priority: NotificationPriority,
        data: Optional[Dict[str, Any]]
    ) -> None:
        """Queue notification for later delivery."""
        key = f"pending_notifications:{user_id}"
        notification = {
            "title": title,
            "message": message,
            "type": notification_type,
            "priority": priority.value,
            "data": data or {},
            "queued_at": datetime.now(timezone.utc).isoformat()
        }
        
        await redis_client.rpush(key, notification)
        # Expire after 24 hours
        await redis_client.expire(key, 86400)

    def _batch_notifications(
        self,
        notifications: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Batch similar notifications to reduce noise."""
        if len(notifications) <= 2:
            return notifications
        
        # Group by type
        by_type: Dict[str, List[Dict]] = {}
        for n in notifications:
            n_type = n.get("type", "info")
            if n_type not in by_type:
                by_type[n_type] = []
            by_type[n_type].append(n)
        
        batched = []
        for n_type, items in by_type.items():
            if len(items) == 1:
                batched.append(items[0])
            else:
                # Combine into single notification
                batched.append({
                    "title": f"{len(items)} updates",
                    "message": "\n".join(i["message"][:50] for i in items[:3]),
                    "type": n_type,
                    "priority": max(i["priority"] for i in items),
                    "data": {"batched_count": len(items)}
                })
        
        return batched


# Singleton instance
notification_service = NotificationService()
