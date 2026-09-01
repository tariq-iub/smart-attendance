from typing import Any

from sqlalchemy.orm import Session

from app.crud.ai.face_verification_log import face_verification_log
from app.services.base import ServiceBase


class FaceVerificationLogService(ServiceBase):

    def __init__(self, db: Session) -> None:
        super().__init__(db=db, crud=face_verification_log)

    def get_verification(self, verification_id: int):
        return self.crud.get(self.db, verification_id)

    def list_verifications(self, skip: int = 0, limit: int = 100):
        return self.crud.get_multi(self.db, skip=skip, limit=limit)

    def create_verification(self, obj_in: Any):
        return self.crud.create(self.db, obj_in)

    def update_verification(
        self,
        verification_id: int,
        obj_in: Any,
    ):
        db_obj = self.crud.get(self.db, verification_id)
        if db_obj is None:
            return None
        return self.crud.update(self.db, db_obj, obj_in)

    def delete_verification(self, verification_id: int):
        return self.crud.remove(self.db, verification_id)
