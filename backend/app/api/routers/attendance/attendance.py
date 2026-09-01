from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.attendance.attendance import (
    AttendanceCreate,
    AttendanceRead,
    AttendanceUpdate,
)
from app.services.attendance.attendance import attendance_service


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance - Records"],
)


@router.post(
    "/",
    response_model=AttendanceRead,
    status_code=status.HTTP_201_CREATED,
)
def create_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
):
    return attendance_service.create(db, data)


@router.get(
    "/{attendance_id}",
    response_model=AttendanceRead,
)
def get_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
):
    return attendance_service.get(db, attendance_id)


@router.get(
    "/",
    response_model=list[AttendanceRead],
)
def list_attendance(
    db: Session = Depends(get_db),
):
    return attendance_service.get_all(db)


@router.put(
    "/{attendance_id}",
    response_model=AttendanceRead,
)
def update_attendance(
    attendance_id: int,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
):
    return attendance_service.update(
        db,
        attendance_id,
        data,
    )


@router.delete(
    "/{attendance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
):
    attendance_service.delete(
        db,
        attendance_id,
    )

    return None