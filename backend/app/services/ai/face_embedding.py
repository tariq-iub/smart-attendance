from typing import Any

from sqlalchemy.orm import Session

from app.crud.ai.face_embedding import face_embedding
from app.services.base import ServiceBase


class FaceEmbeddingService(ServiceBase):

    def __init__(self, db: Session) -> None:
        super().__init__(db=db, crud=face_embedding)

    def get_embedding(self, embedding_id: int):
        return self.crud.get(self.db, embedding_id)

    def list_embeddings(self, skip: int = 0, limit: int = 100):
        return self.crud.get_multi(self.db, skip=skip, limit=limit)

    def create_embedding(self, obj_in: Any):
        return self.crud.create(self.db, obj_in)

    def update_embedding(
        self,
        embedding_id: int,
        obj_in: Any,
    ):
        db_obj = self.crud.get(self.db, embedding_id)
        if db_obj is None:
            return None
        return self.crud.update(self.db, db_obj, obj_in)

    def delete_embedding(self, embedding_id: int):
        return self.crud.remove(self.db, embedding_id)
