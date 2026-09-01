from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.attendance.attendance_adjustment import (
    AttendanceAdjustmentCreate,
    AttendanceAdjustmentRead,
    AttendanceAdjustmentUpdate,
)
from app.services.attendance.attendance_adjustment import (
    attendance_adjustment_service,
)

router = APIRouter(
    prefix="/attendance-adjustments",
    tags=["Attendance - Adjustments"],
)


@router.post(
    "/",
    response_model=AttendanceAdjustmentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_attendance_adjustment(
    data: AttendanceAdjustmentCreate,
    db: Session = Depends(get_db),
):
    return attendance_adjustment_service.create(db, data)


@router.get(
    "/{attendance_adjustment_id}",
    response_model=AttendanceAdjustmentRead,
)
def get_attendance_adjustment(
    attendance_adjustment_id: int,
    db: Session = Depends(get_db),
):
    return attendance_adjustment_service.get(
        db,
        attendance_adjustment_id,
    )


@router.get(
    "/",
    response_model=list[AttendanceAdjustmentRead],
)
def list_attendance_adjustments(db: Session = Depends(get_db)):
    return attendance_adjustment_service.get_all(db)


@router.put(
    "/{attendance_adjustment_id}",
    response_model=AttendanceAdjustmentRead,
)
def update_attendance_adjustment(
    attendance_adjustment_id: int,
    data: AttendanceAdjustmentUpdate,
    db: Session = Depends(get_db),
):
    return attendance_adjustment_service.update(
        db,
        attendance_adjustment_id,
        data,
    )


@router.delete(
    "/{attendance_adjustment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_attendance_adjustment(
    attendance_adjustment_id: int,
    db: Session = Depends(get_db),
):
    attendance_adjustment_service.delete(
        db,
        attendance_adjustment_id,
    )
