"""
ORBIT - Background Task Scheduler
Runs periodic cognitive learning and memory consolidation
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.database import async_engine
from app.core.redis import redis_client
from app.models import User
from app.agents import CognitiveProfileAgent


class BackgroundScheduler:
    """
    Background scheduler for periodic tasks.
    
    Tasks:
    - Cognitive profile learning (every hour)
    - Memory consolidation (every 6 hours)
    - Intent decay (every hour)
    """

    def __init__(self):
        self.running = False
        self.tasks: list[asyncio.Task] = []

    async def start(self):
        """Start the scheduler."""
        if self.running:
            return

        self.running = True
        
        # Create async session factory
        async_session = async_sessionmaker(
            async_engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

        # Start background tasks
        self.tasks.append(
            asyncio.create_task(self._learning_loop(async_session))
        )
        self.tasks.append(
            asyncio.create_task(self._memory_consolidation_loop(async_session))
        )
        self.tasks.append(
            asyncio.create_task(self._intent_decay_loop(async_session))
        )

    async def stop(self):
        """Stop the scheduler."""
        self.running = False
        for task in self.tasks:
            task.cancel()
        self.tasks.clear()

    async def _learning_loop(
        self,
        async_session: async_sessionmaker,
        interval_minutes: int = 60,
    ):
        """
        Periodic cognitive profile learning.
        
        Runs for all active users every hour.
        """
        while self.running:
            try:
                async with async_session() as db:
                    # Get active users (active in last 24 hours)
                    cutoff = datetime.utcnow() - timedelta(hours=24)
                    result = await db.execute(
                        select(User).where(
                            User.is_active == True,
                            User.last_active_at >= cutoff,
                        )
                    )
                    users = result.scalars().all()

                    for user in users:
                        try:
                            agent = CognitiveProfileAgent(db, redis_client)
                            await agent.learn_from_events(
                                user_id=user.id,
                                lookback_hours=2,
                            )
                        except Exception as e:
                            print(f"Learning error for user {user.id}: {e}")

                    await db.commit()

            except Exception as e:
                print(f"Learning loop error: {e}")

            # Wait for next interval
            await asyncio.sleep(interval_minutes * 60)

    async def _memory_consolidation_loop(
        self,
        async_session: async_sessionmaker,
        interval_hours: int = 6,
    ):
        """
        Periodic memory consolidation.
        
        Promotes short-term memories to long-term based on retrieval.
        """
        while self.running:
            try:
                async with async_session() as db:
                    from app.services.memory_service import MemoryService
                    
                    # Get all users
                    result = await db.execute(select(User))
                    users = result.scalars().all()

                    for user in users:
                        try:
                            memory_service = MemoryService(db, redis_client)
                            await memory_service.consolidate_memories(user.id)
                        except Exception as e:
                            print(f"Memory consolidation error for user {user.id}: {e}")

                    await db.commit()

            except Exception as e:
                print(f"Memory consolidation loop error: {e}")

            # Wait for next interval
            await asyncio.sleep(interval_hours * 3600)

    async def _intent_decay_loop(
        self,
        async_session: async_sessionmaker,
        interval_minutes: int = 60,
    ):
        """
        Apply intent decay.
        
        Intents lose priority over time if not acted upon.
        """
        while self.running:
            try:
                async with async_session() as db:
                    from app.models import Intent
                    
                    # Get unprocessed intents older than 1 hour
                    cutoff = datetime.utcnow() - timedelta(hours=1)
                    result = await db.execute(
                        select(Intent).where(
                            Intent.is_processed == False,
                            Intent.created_at < cutoff,
                        )
                    )
                    intents = result.scalars().all()

                    for intent in intents:
                        # Apply decay
                        hours_old = (datetime.utcnow() - intent.created_at).seconds / 3600
                        decay = intent.decay_rate * hours_old
                        intent.current_priority = max(0.1, intent.initial_priority - decay)

                    await db.commit()

            except Exception as e:
                print(f"Intent decay loop error: {e}")

            # Wait for next interval
            await asyncio.sleep(interval_minutes * 60)


# Global scheduler instance
scheduler = BackgroundScheduler()


async def start_scheduler():
    """Start the background scheduler."""
    await scheduler.start()


async def stop_scheduler():
    """Stop the background scheduler."""
    await scheduler.stop()
