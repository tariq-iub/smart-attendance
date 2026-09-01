from app.api.routers.ai.face_embedding import router as face_embedding_router
from app.api.routers.ai.face_registration import router as face_registration_router
from app.api.routers.ai.face_verification_log import router as face_verification_log_router
from app.api.routers.ai.recognition_result import router as recognition_result_router
from app.api.routers.ai.recognition_session import router as recognition_session_router

__all__ = [
    "face_embedding_router",
    "face_registration_router",
    "face_verification_log_router",
    "recognition_result_router",
    "recognition_session_router",
]
