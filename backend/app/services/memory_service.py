"""
ORBIT - Memory Service
Personal memory system for RAG and context
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.redis import RedisClient
from app.models import Memory, MemoryType
from app.schemas import MemoryCreate, MemoryResponse, MemorySearchResult


class MemoryService:
    """Service for memory management and RAG."""

    def __init__(self, db: AsyncSession, redis: RedisClient):
        self.db = db
        self.redis = redis
        # Vector store will be initialized here (FAISS)
        self._vector_store = None

    async def create_memory(
        self,
        user_id: UUID,
        memory_data: MemoryCreate,
    ) -> Memory:
        """
        Create a new memory entry.
        """
        memory = Memory(
            user_id=user_id,
            content=memory_data.content,
            memory_type=memory_data.memory_type,
            importance_score=memory_data.importance_score,
            context_tags=memory_data.context_tags,
        )

        # Generate summary for long content
        if len(memory_data.content) > 500:
            memory.summary = memory_data.content[:200] + "..."

        # Set expiry for short-term memories
        if memory_data.memory_type == MemoryType.SHORT_TERM:
            memory.expires_at = datetime.utcnow() + timedelta(hours=24)

        self.db.add(memory)
        await self.db.commit()
        await self.db.refresh(memory)

        # TODO: Generate and store embedding
        # await self._store_embedding(memory)

        return memory

    async def search_memories(
        self,
        user_id: UUID,
        query: str,
        limit: int = 10,
        memory_types: Optional[list[MemoryType]] = None,
        min_relevance: float = 0.5,
    ) -> list[MemorySearchResult]:
        """
        Semantic search across memories.
        
        IMPORTANT: Only returns relevant memories to avoid prompt overload.
        """
        # For now, do simple keyword search
        # TODO: Implement vector similarity search with FAISS

        base_query = select(Memory).where(
            Memory.user_id == user_id,
            Memory.is_active == True,
        )

        if memory_types:
            base_query = base_query.where(Memory.memory_type.in_(memory_types))

        # Simple relevance: check if query terms appear in content
        base_query = base_query.where(
            Memory.content.ilike(f"%{query}%")
        ).order_by(
            Memory.importance_score.desc()
        ).limit(limit)

        result = await self.db.execute(base_query)
        memories = result.scalars().all()

        # Update retrieval counts
        for memory in memories:
            memory.retrieval_count += 1
            memory.last_retrieved_at = datetime.utcnow()
        await self.db.commit()

        # Return with mock relevance scores for now
        return [
            MemorySearchResult(
                memory=MemoryResponse.model_validate(m),
                relevance_score=0.8,  # TODO: Real similarity score
                context_match=0.7,
            )
            for m in memories
        ]

    async def get_context_memories(
        self,
        user_id: UUID,
        intent_id: Optional[UUID] = None,
        task_id: Optional[UUID] = None,
        tags: Optional[list[str]] = None,
        limit: int = 5,
    ) -> list[Memory]:
        """
        Get memories relevant to current context.
        """
        query = select(Memory).where(
            Memory.user_id == user_id,
            Memory.is_active == True,
        )

        # Filter by source if provided
        if intent_id:
            query = query.where(Memory.source_id == intent_id)
        if task_id:
            query = query.where(Memory.source_id == task_id)

        # Filter by tags if provided
        if tags:
            query = query.where(Memory.context_tags.overlap(tags))

        query = query.order_by(
            Memory.importance_score.desc(),
            Memory.created_at.desc(),
        ).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def consolidate_memories(
        self,
        user_id: UUID,
    ) -> dict:
        """
        Consolidate short-term memories into long-term.
        
        This runs periodically to:
        - Identify patterns in recent memories
        - Create higher-level insights
        - Prune redundant memories
        """
        # Get short-term memories older than 12 hours
        cutoff = datetime.utcnow() - timedelta(hours=12)

        result = await self.db.execute(
            select(Memory).where(
                Memory.user_id == user_id,
                Memory.memory_type == MemoryType.SHORT_TERM,
                Memory.created_at < cutoff,
                Memory.is_active == True,
            )
        )
        old_short_term = result.scalars().all()

        consolidated_count = 0
        promoted_count = 0

        for memory in old_short_term:
            # If retrieved multiple times, promote to long-term
            if memory.retrieval_count >= 3:
                memory.memory_type = MemoryType.LONG_TERM
                memory.expires_at = None
                promoted_count += 1
            # If never retrieved, let it expire
            elif memory.retrieval_count == 0:
                memory.is_active = False
                consolidated_count += 1

        await self.db.commit()

        return {
            "consolidated": consolidated_count,
            "promoted_to_long_term": promoted_count,
            "message": f"Memory consolidation complete. {promoted_count} memories promoted.",
        }

    async def get_patterns(
        self,
        user_id: UUID,
        time_range_days: int = 30,
    ) -> list[dict]:
        """
        Get identified patterns from memory analysis.
        """
        # Get recent long-term and identity memories
        cutoff = datetime.utcnow() - timedelta(days=time_range_days)

        result = await self.db.execute(
            select(Memory).where(
                Memory.user_id == user_id,
                Memory.memory_type.in_([MemoryType.LONG_TERM, MemoryType.IDENTITY]),
                Memory.created_at >= cutoff,
                Memory.is_active == True,
            ).order_by(Memory.importance_score.desc()).limit(20)
        )
        memories = result.scalars().all()

        # Extract patterns from tags
        tag_counts = {}
        for memory in memories:
            for tag in memory.context_tags or []:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

        patterns = []

        # Convert tag frequency to patterns
        for tag, count in sorted(tag_counts.items(), key=lambda x: -x[1])[:5]:
            if count >= 3:
                patterns.append({
                    "type": "recurring_context",
                    "pattern": tag,
                    "frequency": count,
                    "observation": f"'{tag}' appears frequently in your memories",
                })

        return patterns

    async def _store_embedding(self, memory: Memory):
        """
        Generate and store embedding for a memory.
        TODO: Implement with FAISS
        """
        pass

    async def _search_by_embedding(
        self,
        query_embedding: list[float],
        user_id: UUID,
        limit: int,
    ) -> list[tuple[UUID, float]]:
        """
        Search memories by embedding similarity.
        TODO: Implement with FAISS
        """
        return []
