from app.api.routers.attendance.attendance import router as attendance_router
from app.api.routers.attendance.attendance_session import (
    router as attendance_session_router,
)
from app.api.routers.attendance.attendance_adjustment import (
    router as attendance_adjustment_router,
)
from app.api.routers.attendance.attendance_audit_log import (
    router as attendance_audit_log_router,
)
from app.api.routers.attendance.attendance_summary import (
    router as attendance_summary_router,
)

__all__ = [
    "attendance_router",
    "attendance_session_router",
    "attendance_adjustment_router",
    "attendance_audit_log_router",
    "attendance_summary_router",
]
