from app.crud.base import CRUDBase
from app.models.ai.face_embedding import FaceEmbedding
from app.schemas.ai.face_embedding import FaceEmbeddingCreate, FaceEmbeddingUpdate


class CRUDFaceEmbedding(CRUDBase[FaceEmbedding, FaceEmbeddingCreate, FaceEmbeddingUpdate]):
    pass


face_embedding = CRUDFaceEmbedding(FaceEmbedding)
