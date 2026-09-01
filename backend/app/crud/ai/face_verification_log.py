from app.crud.base import CRUDBase
from app.models.ai.face_verification_log import FaceVerificationLog
from app.schemas.ai.face_verification_log import FaceVerificationLogCreate, FaceVerificationLogUpdate


class CRUDFaceVerificationLog(CRUDBase[FaceVerificationLog, FaceVerificationLogCreate, FaceVerificationLogUpdate]):
    pass


face_verification_log = CRUDFaceVerificationLog(FaceVerificationLog)
