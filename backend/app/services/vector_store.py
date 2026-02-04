"""
ORBIT - Vector Store Service
FAISS-based vector similarity search for memory RAG
"""

import os
import pickle
from pathlib import Path
from typing import Optional
from uuid import UUID

import numpy as np

from app.core.config import settings


class VectorStore:
    """
    Vector store using FAISS for semantic memory search.
    
    Philosophy:
    - Only inject relevant personal memory
    - Never overload prompts
    - Memory relevance score required
    """

    def __init__(self):
        self.dimension = settings.vector_dimension
        self.index_path = Path(settings.vector_index_path)
        self.index = None
        self.id_map: dict[int, str] = {}  # FAISS idx -> memory UUID
        self.reverse_map: dict[str, int] = {}  # memory UUID -> FAISS idx
        self._initialized = False

    async def initialize(self):
        """Initialize or load the vector store."""
        if self._initialized:
            return

        try:
            import faiss
            
            # Create directory if needed
            self.index_path.parent.mkdir(parents=True, exist_ok=True)
            
            index_file = self.index_path / "index.faiss"
            map_file = self.index_path / "id_map.pkl"
            
            if index_file.exists() and map_file.exists():
                # Load existing index
                self.index = faiss.read_index(str(index_file))
                with open(map_file, "rb") as f:
                    data = pickle.load(f)
                    self.id_map = data["id_map"]
                    self.reverse_map = data["reverse_map"]
            else:
                # Create new index
                # Using IndexFlatIP for inner product (cosine similarity with normalized vectors)
                self.index = faiss.IndexFlatIP(self.dimension)
            
            self._initialized = True
            
        except ImportError:
            # FAISS not available, use fallback
            self.index = None
            self._initialized = True

    async def add_embedding(
        self,
        memory_id: str,
        embedding: list[float],
    ) -> bool:
        """Add an embedding to the vector store."""
        if self.index is None:
            return False

        try:
            import faiss
            
            # Normalize for cosine similarity
            vector = np.array([embedding], dtype=np.float32)
            faiss.normalize_L2(vector)
            
            # Get next index
            idx = self.index.ntotal
            
            # Add to index
            self.index.add(vector)
            
            # Update maps
            self.id_map[idx] = memory_id
            self.reverse_map[memory_id] = idx
            
            # Persist
            await self._save()
            
            return True
            
        except Exception as e:
            print(f"Error adding embedding: {e}")
            return False

    async def search(
        self,
        query_embedding: list[float],
        k: int = 10,
        min_score: float = 0.5,
    ) -> list[tuple[str, float]]:
        """
        Search for similar embeddings.
        
        Returns list of (memory_id, similarity_score) tuples.
        """
        if self.index is None or self.index.ntotal == 0:
            return []

        try:
            import faiss
            
            # Normalize query
            query = np.array([query_embedding], dtype=np.float32)
            faiss.normalize_L2(query)
            
            # Search
            k = min(k, self.index.ntotal)
            scores, indices = self.index.search(query, k)
            
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx >= 0 and score >= min_score:
                    memory_id = self.id_map.get(int(idx))
                    if memory_id:
                        results.append((memory_id, float(score)))
            
            return results
            
        except Exception as e:
            print(f"Error searching embeddings: {e}")
            return []

    async def remove_embedding(self, memory_id: str) -> bool:
        """
        Remove an embedding from the store.
        
        Note: FAISS doesn't support deletion well, so we mark as removed.
        Full rebuild needed periodically for cleanup.
        """
        if memory_id in self.reverse_map:
            idx = self.reverse_map.pop(memory_id)
            del self.id_map[idx]
            await self._save()
            return True
        return False

    async def _save(self):
        """Persist index and maps to disk."""
        if self.index is None:
            return

        try:
            import faiss
            
            self.index_path.mkdir(parents=True, exist_ok=True)
            
            index_file = self.index_path / "index.faiss"
            map_file = self.index_path / "id_map.pkl"
            
            faiss.write_index(self.index, str(index_file))
            
            with open(map_file, "wb") as f:
                pickle.dump({
                    "id_map": self.id_map,
                    "reverse_map": self.reverse_map,
                }, f)
                
        except Exception as e:
            print(f"Error saving vector store: {e}")

    @property
    def count(self) -> int:
        """Number of embeddings in the store."""
        if self.index is None:
            return 0
        return self.index.ntotal


# Global vector store instance
vector_store = VectorStore()


async def get_vector_store() -> VectorStore:
    """Get initialized vector store."""
    await vector_store.initialize()
    return vector_store
