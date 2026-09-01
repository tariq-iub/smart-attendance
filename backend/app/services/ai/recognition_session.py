from typing import Any

from sqlalchemy.orm import Session

from app.crud.ai.recognition_session import recognition_session
from app.services.base import ServiceBase


class RecognitionSessionService(ServiceBase):

    def __init__(self, db: Session) -> None:
        super().__init__(db=db, crud=recognition_session)

    def get_session(self, recognition_session_id: int):
        return self.crud.get(self.db, recognition_session_id)

    def list_sessions(self, skip: int = 0, limit: int = 100):
        return self.crud.get_multi(self.db, skip=skip, limit=limit)

    def create_session(self, obj_in: Any):
        return self.crud.create(self.db, obj_in)

    def update_session(
        self,
        recognition_session_id: int,
        obj_in: Any,
    ):
        db_obj = self.crud.get(self.db, recognition_session_id)
        if db_obj is None:
            return None
        return self.crud.update(self.db, db_obj, obj_in)

    def delete_session(self, recognition_session_id: int):
        return self.crud.remove(self.db, recognition_session_id)
