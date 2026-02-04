"""
ORBIT - Embedding Service
Generate embeddings for memory and semantic search
"""

from typing import Optional

from anthropic import AsyncAnthropic

from app.core.config import settings


class EmbeddingService:
    """
    Service for generating text embeddings.
    """

    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.dimension = settings.vector_dimension

    async def generate_embedding(
        self,
        text: str,
        model: str = "text-embedding-3-small",
    ) -> Optional[list[float]]:
        """
        Generate embedding for text.
        
        Uses embedding model for vector generation.
        """
        try:
            # For production, use OpenAI embeddings or similar
            # For now, generate a pseudo-embedding using text hashing
            # This is a placeholder - replace with real embeddings
            
            import hashlib
            import numpy as np
            
            # Create deterministic pseudo-embedding from text
            # THIS IS NOT A REAL EMBEDDING - replace with actual embedding API
            hash_bytes = hashlib.sha256(text.encode()).digest()
            
            # Expand hash to embedding dimension
            np.random.seed(int.from_bytes(hash_bytes[:4], 'big'))
            embedding = np.random.randn(self.dimension).astype(np.float32)
            
            # Normalize
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            
            return embedding.tolist()
            
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return None

    async def generate_batch_embeddings(
        self,
        texts: list[str],
    ) -> list[Optional[list[float]]]:
        """Generate embeddings for multiple texts."""
        results = []
        for text in texts:
            embedding = await self.generate_embedding(text)
            results.append(embedding)
        return results


# Singleton
embedding_service = EmbeddingService()


async def get_embedding_service() -> EmbeddingService:
    """Get embedding service instance."""
    return embedding_service
