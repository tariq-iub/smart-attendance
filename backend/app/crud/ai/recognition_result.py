from app.crud.base import CRUDBase
from app.models.ai.recognition_result import RecognitionResult
from app.schemas.ai.recognition_result import RecognitionResultCreate, RecognitionResultUpdate


class CRUDRecognitionResult(CRUDBase[RecognitionResult, RecognitionResultCreate, RecognitionResultUpdate]):
    pass


recognition_result = CRUDRecognitionResult(RecognitionResult)
