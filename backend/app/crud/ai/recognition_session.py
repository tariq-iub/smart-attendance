from app.crud.base import CRUDBase
from app.models.ai.recognition_session import RecognitionSession
from app.schemas.ai.recognition_session import RecognitionSessionCreate, RecognitionSessionUpdate


class CRUDRecognitionSession(CRUDBase[RecognitionSession, RecognitionSessionCreate, RecognitionSessionUpdate]):
    pass


recognition_session = CRUDRecognitionSession(RecognitionSession)
