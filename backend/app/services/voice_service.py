"""
ORBIT - Voice Service
Voice input/output processing
"""

import base64
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import RedisClient
from app.core.config import settings
from app.schemas import VoiceInputResponse, IntentResponse
from app.services.intent_service import IntentService


class VoiceService:
    """Service for voice processing."""

    def __init__(self, db: Optional[AsyncSession], redis: Optional[RedisClient]):
        self.db = db
        self.redis = redis
        self._whisper_model = None

    async def transcribe_and_process(
        self,
        user_id: UUID,
        audio_data: str,
        audio_format: str = "webm",
        sample_rate: int = 16000,
    ) -> VoiceInputResponse:
        """
        Transcribe audio and optionally create an intent.
        
        Voice input pipeline:
        Mic → Speech-to-Text → Intent Engine → Response
        """
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_data)

        # Transcribe
        transcription, confidence = await self._transcribe(
            audio_bytes,
            audio_format,
            sample_rate,
        )

        # Create intent from transcription
        intent = None
        if transcription and len(transcription.strip()) > 0:
            intent_service = IntentService(self.db, self.redis)
            intent_obj = await intent_service.create_intent(
                user_id=user_id,
                raw_input=transcription,
                source="voice",
            )
            intent = IntentResponse.model_validate(intent_obj)

        return VoiceInputResponse(
            transcription=transcription,
            confidence=confidence,
            intent=intent,
            language_detected="en",
        )

    async def transcribe_file(
        self,
        user_id: UUID,
        file_content: bytes,
        filename: str,
    ) -> VoiceInputResponse:
        """
        Transcribe an uploaded audio file.
        """
        # Determine format from filename
        audio_format = filename.split(".")[-1].lower()

        transcription, confidence = await self._transcribe(
            file_content,
            audio_format,
            16000,
        )

        # Create intent
        intent = None
        if transcription and len(transcription.strip()) > 0:
            intent_service = IntentService(self.db, self.redis)
            intent_obj = await intent_service.create_intent(
                user_id=user_id,
                raw_input=transcription,
                source="voice",
            )
            intent = IntentResponse.model_validate(intent_obj)

        return VoiceInputResponse(
            transcription=transcription,
            confidence=confidence,
            intent=intent,
            language_detected="en",
        )

    async def _transcribe(
        self,
        audio_bytes: bytes,
        audio_format: str,
        sample_rate: int,
    ) -> tuple[str, float]:
        """
        Transcribe audio using Whisper.
        
        Returns (transcription, confidence).
        """
        if not settings.enable_voice:
            return "", 0.0

        try:
            # Lazy load Whisper model
            if self._whisper_model is None:
                import whisper
                self._whisper_model = whisper.load_model(settings.whisper_model)

            # Save to temp file (Whisper requires file path)
            import tempfile
            import os

            with tempfile.NamedTemporaryFile(
                suffix=f".{audio_format}",
                delete=False,
            ) as f:
                f.write(audio_bytes)
                temp_path = f.name

            try:
                # Transcribe
                result = self._whisper_model.transcribe(
                    temp_path,
                    language="en",
                    fp16=False,
                )

                transcription = result.get("text", "").strip()
                # Whisper doesn't provide confidence directly,
                # use average log probability as proxy
                segments = result.get("segments", [])
                if segments:
                    avg_prob = sum(
                        s.get("avg_logprob", -1) for s in segments
                    ) / len(segments)
                    # Convert log prob to confidence (rough approximation)
                    confidence = min(1.0, max(0.0, 1.0 + avg_prob))
                else:
                    confidence = 0.5

                return transcription, confidence

            finally:
                os.unlink(temp_path)

        except Exception as e:
            print(f"Transcription error: {e}")
            return "", 0.0

    async def generate_speech(
        self,
        text: str,
        voice_style: str = "calm",
    ) -> str:
        """
        Generate speech from text.
        
        Voice philosophy:
        - Calm, neutral voice
        - Slower pace than typical assistants
        - Silence is allowed
        
        Returns base64 encoded audio.
        """
        # For now, return empty - TTS integration would go here
        # Options: edge-tts, Azure TTS, ElevenLabs
        
        # Placeholder: would integrate with TTS service
        # Example with edge-tts (pip install edge-tts):
        #
        # import edge_tts
        # communicate = edge_tts.Communicate(text, "en-US-AriaNeural")
        # audio_data = await communicate.save_audio()
        # return base64.b64encode(audio_data).decode()

        return ""
