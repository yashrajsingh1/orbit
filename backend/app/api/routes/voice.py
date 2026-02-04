"""
ORBIT - Voice API Routes
Voice input/output processing
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import RedisClient, get_redis
from app.models import User
from app.schemas import VoiceInputRequest, VoiceInputResponse, VoiceOutputRequest
from app.services.voice_service import VoiceService
from app.api.deps import get_current_user

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/transcribe", response_model=VoiceInputResponse)
async def transcribe_audio(
    request: VoiceInputRequest,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Transcribe audio to text and optionally create an intent.
    
    Voice input pipeline:
    Mic → Speech-to-Text → Intent Engine → Response
    """
    voice_service = VoiceService(db, redis)
    result = await voice_service.transcribe_and_process(
        user_id=current_user.id,
        audio_data=request.audio_data,
        audio_format=request.format,
        sample_rate=request.sample_rate,
    )
    return result


@router.post("/transcribe/upload", response_model=VoiceInputResponse)
async def transcribe_audio_file(
    audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Transcribe uploaded audio file.
    
    Accepts: wav, mp3, webm, ogg
    """
    voice_service = VoiceService(db, redis)
    
    # Read file content
    content = await audio.read()
    
    result = await voice_service.transcribe_file(
        user_id=current_user.id,
        file_content=content,
        filename=audio.filename,
    )
    return result


@router.post("/speak")
async def generate_speech(
    request: VoiceOutputRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate speech from text.
    
    Voice philosophy:
    - Calm, neutral voice
    - Slower pace than typical assistants
    - Silence is allowed
    - Voice is intentional, not chatty
    
    Returns audio data as base64.
    """
    voice_service = VoiceService(None, None)  # TTS doesn't need DB/Redis
    audio_data = await voice_service.generate_speech(
        text=request.text,
        voice_style=request.voice_style,
    )
    return {"audio_data": audio_data, "format": "mp3"}


@router.get("/settings")
async def get_voice_settings(
    current_user: User = Depends(get_current_user),
):
    """
    Get user's voice settings.
    """
    return {
        "voice_enabled": current_user.voice_enabled,
        "language": current_user.language,
        "voice_style": "calm",  # Default
        "speech_rate": 0.9,  # Slightly slower
        "pause_between_sentences": True,
    }


@router.post("/settings")
async def update_voice_settings(
    voice_enabled: bool = None,
    voice_style: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update user's voice settings.
    """
    if voice_enabled is not None:
        current_user.voice_enabled = voice_enabled
    
    await db.commit()
    
    return {"message": "Settings updated"}
