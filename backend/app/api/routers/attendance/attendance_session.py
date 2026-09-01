from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.attendance.attendance_session import (
    AttendanceSessionCreate,
    AttendanceSessionRead,
    AttendanceSessionUpdate,
)
from app.services.attendance.attendance_session import (
    AttendanceSessionService,
)


router = APIRouter(
    prefix="/attendance-sessions",
    tags=["Attendance - Sessions"],
)


# ============================================================
# START ATTENDANCE
# ============================================================

@router.post(
    "/",
    response_model=AttendanceSessionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_attendance_session(
    data: AttendanceSessionCreate,
    db: Session = Depends(get_db),
):
    service = AttendanceSessionService(db)

    try:
        return service.create(data)

    except ValueError as exc:

        message = str(exc)

        if "not found" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message,
            ) from exc

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=message,
        ) from exc


# ============================================================
# FINALIZE ATTENDANCE SESSION
# ============================================================

@router.post(
    "/{attendance_session_id}/finalize",
    response_model=AttendanceSessionRead,
)
def finalize_attendance_session(
    attendance_session_id: int,
    db: Session = Depends(get_db),
):
    service = AttendanceSessionService(db)

    try:
        return service.finalize(
            attendance_session_id
        )

    except ValueError as exc:

        message = str(exc)

        if "not found" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message,
            ) from exc

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=message,
        ) from exc

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Attendance session could not be finalized."
            ),
        ) from exc


# ============================================================
# GET SINGLE SESSION
# ============================================================

@router.get(
    "/{attendance_session_id}",
    response_model=AttendanceSessionRead,
)
def get_attendance_session(
    attendance_session_id: int,
    db: Session = Depends(get_db),
):
    service = AttendanceSessionService(db)

    session = service.get(
        attendance_session_id
    )

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance session not found",
        )

    return session


# ============================================================
# LIST SESSIONS
# ============================================================

@router.get(
    "/",
    response_model=list[AttendanceSessionRead],
)
def list_attendance_sessions(
    db: Session = Depends(get_db),
):
    service = AttendanceSessionService(db)

    return service.get_all()


# ============================================================
# UPDATE SESSION
# ============================================================

@router.put(
    "/{attendance_session_id}",
    response_model=AttendanceSessionRead,
)
def update_attendance_session(
    attendance_session_id: int,
    data: AttendanceSessionUpdate,
    db: Session = Depends(get_db),
):
    service = AttendanceSessionService(db)

    session = service.update(
        attendance_session_id,
        data,
    )

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance session not found",
        )

    return session


# ============================================================
# DELETE SESSION
# ============================================================

@router.delete(
    "/{attendance_session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_attendance_session(
    attendance_session_id: int,
    db: Session = Depends(get_db),
):
    service = AttendanceSessionService(db)

    session = service.delete(
        attendance_session_id
    )

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance session not found",
        )

    return None