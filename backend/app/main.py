"""
ORBIT - Personal Cognitive Operating System
Main FastAPI Application

Philosophy:
- ORBIT never spams
- ORBIT never overwhelms
- ORBIT prefers silence over noise
- ORBIT optimizes attention, not engagement
- ORBIT learns passively, asks minimally
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.redis import redis_client
from app.core.scheduler import start_scheduler, stop_scheduler
from app.api.routes import (
    auth,
    intent,
    planner,
    executor,
    evaluator,
    memory,
    voice,
    events,
    orchestrator,
    notifications,
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Starting ORBIT", env=settings.app_env)

    # Initialize database
    await init_db()
    logger.info("Database initialized")

    # Initialize Redis
    await redis_client.connect()
    logger.info("Redis connected")

    # Start background scheduler
    await start_scheduler()
    logger.info("Background scheduler started")

    yield

    # Shutdown
    logger.info("Shutting down ORBIT")
    await stop_scheduler()
    await close_db()
    await redis_client.disconnect()


# Create FastAPI application
app = FastAPI(
    title="ORBIT",
    description="""
    Personal Cognitive Operating System
    
    ORBIT helps you think less and act better by managing attention, 
    intent, and progress through AI, memory, and behavior modeling.
    
    ## Core Philosophy
    
    - **Never spam** — No notifications unless critical
    - **Never overwhelm** — Information is revealed progressively
    - **Prefer silence** — Absence of action is valid
    - **Optimize attention** — We don't want more screen time
    - **Learn passively** — Observation over interrogation
    """,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.is_development else ["https://orbit.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(auth.router)
app.include_router(intent.router)
app.include_router(planner.router)
app.include_router(executor.router)
app.include_router(evaluator.router)
app.include_router(memory.router)
app.include_router(voice.router)
app.include_router(events.router)
app.include_router(orchestrator.router)  # Main cognitive loop
app.include_router(notifications.router)  # Intelligent notifications


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "ORBIT",
        "tagline": "Think less. Act better.",
        "status": "operational",
        "philosophy": [
            "ORBIT never spams",
            "ORBIT never overwhelms",
            "ORBIT prefers silence over noise",
            "ORBIT optimizes attention, not engagement",
            "ORBIT learns passively, asks minimally",
        ],
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.app_env,
        "features": {
            "voice": settings.enable_voice,
            "websockets": settings.enable_websockets,
            "memory_persistence": settings.enable_memory_persistence,
            "cognitive_profiling": settings.enable_cognitive_profiling,
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.is_development,
        workers=settings.workers,
    )
