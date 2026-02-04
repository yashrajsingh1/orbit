"""
ORBIT - Memory API Routes
Personal memory system for RAG and context
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.redis import RedisClient, get_redis
from app.models import User, Memory, MemoryType
from app.schemas import MemoryCreate, MemoryResponse, MemorySearchResult
from app.services.memory_service import MemoryService
from app.api.deps import get_current_user

router = APIRouter(prefix="/memory", tags=["memory"])


@router.post("/", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
async def create_memory(
    memory_data: MemoryCreate,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new memory entry.
    
    Memories are automatically:
    - Embedded for semantic search
    - Scored for importance
    - Tagged for context
    """
    memory_service = MemoryService(db, redis)
    memory = await memory_service.create_memory(
        user_id=current_user.id,
        memory_data=memory_data,
    )
    return memory


@router.get("/", response_model=list[MemoryResponse])
async def list_memories(
    memory_type: Optional[MemoryType] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List memories with optional type filter.
    """
    query = select(Memory).where(
        Memory.user_id == current_user.id,
        Memory.is_active == True,
    )
    
    if memory_type:
        query = query.where(Memory.memory_type == memory_type)
    
    query = query.order_by(Memory.importance_score.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/search", response_model=list[MemorySearchResult])
async def search_memories(
    query: str,
    limit: int = 10,
    memory_types: Optional[list[MemoryType]] = None,
    min_relevance: float = 0.5,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Semantic search across memories.
    
    This is the RAG retrieval endpoint. Returns memories
    ranked by relevance to the query.
    
    IMPORTANT: Only returns relevant memories above min_relevance
    threshold to avoid prompt overload.
    """
    memory_service = MemoryService(db, redis)
    results = await memory_service.search_memories(
        user_id=current_user.id,
        query=query,
        limit=limit,
        memory_types=memory_types,
        min_relevance=min_relevance,
    )
    return results


@router.get("/context")
async def get_context_memories(
    intent_id: Optional[UUID] = None,
    task_id: Optional[UUID] = None,
    tags: Optional[list[str]] = None,
    limit: int = 5,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Get memories relevant to current context.
    
    Use this to inject relevant personal memory into
    AI prompts without overloading.
    """
    memory_service = MemoryService(db, redis)
    memories = await memory_service.get_context_memories(
        user_id=current_user.id,
        intent_id=intent_id,
        task_id=task_id,
        tags=tags,
        limit=limit,
    )
    return memories


@router.get("/{memory_id}", response_model=MemoryResponse)
async def get_memory(
    memory_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific memory by ID.
    """
    result = await db.execute(
        select(Memory).where(
            Memory.id == memory_id,
            Memory.user_id == current_user.id,
        )
    )
    memory = result.scalar_one_or_none()
    
    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )
    
    return memory


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(
    memory_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete (deactivate) a memory.
    """
    result = await db.execute(
        select(Memory).where(
            Memory.id == memory_id,
            Memory.user_id == current_user.id,
        )
    )
    memory = result.scalar_one_or_none()
    
    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )
    
    memory.is_active = False
    await db.commit()


@router.post("/consolidate")
async def consolidate_memories(
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Consolidate short-term memories into long-term.
    
    This runs periodically to:
    - Identify patterns in recent memories
    - Create higher-level insights
    - Prune redundant memories
    - Update identity memories
    """
    memory_service = MemoryService(db, redis)
    result = await memory_service.consolidate_memories(user_id=current_user.id)
    return result


@router.get("/patterns")
async def get_patterns(
    time_range_days: int = 30,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Get identified patterns from memory analysis.
    
    Returns patterns like:
    - "You often feel stuck on Mondays"
    - "Creative tasks work best in the morning"
    - "You abandon tasks after 2+ deferrals"
    """
    memory_service = MemoryService(db, redis)
    patterns = await memory_service.get_patterns(
        user_id=current_user.id,
        time_range_days=time_range_days,
    )
    return patterns
