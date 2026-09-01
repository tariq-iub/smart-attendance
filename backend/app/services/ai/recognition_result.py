from typing import Any

from sqlalchemy.orm import Session

from app.crud.ai.recognition_result import recognition_result
from app.services.base import ServiceBase


class RecognitionResultService(ServiceBase):

    def __init__(self, db: Session) -> None:
        super().__init__(db=db, crud=recognition_result)

    def get_result(self, result_id: int):
        return self.crud.get(self.db, result_id)

    def list_results(self, skip: int = 0, limit: int = 100):
        return self.crud.get_multi(self.db, skip=skip, limit=limit)

    def create_result(self, obj_in: Any):
        return self.crud.create(self.db, obj_in)

    def update_result(
        self,
        result_id: int,
        obj_in: Any,
    ):
        db_obj = self.crud.get(self.db, result_id)
        if db_obj is None:
            return None
        return self.crud.update(self.db, db_obj, obj_in)

    def delete_result(self, result_id: int):
        return self.crud.remove(self.db, result_id)
