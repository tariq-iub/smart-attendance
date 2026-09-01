from app.crud.base import CRUDBase
from app.models.ai.face_registration import FaceRegistration
from app.schemas.ai.face_registration import FaceRegistrationCreate, FaceRegistrationUpdate


class CRUDFaceRegistration(CRUDBase[FaceRegistration, FaceRegistrationCreate, FaceRegistrationUpdate]):
    pass


face_registration = CRUDFaceRegistration(FaceRegistration)
