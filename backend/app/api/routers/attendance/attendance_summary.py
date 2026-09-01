from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.attendance.attendance_summary import (
    AttendanceSummaryCreate,
    AttendanceSummaryRead,
    AttendanceSummaryUpdate,
)
from app.services.attendance.attendance_summary import (
    attendance_summary_service,
)

router = APIRouter(
    prefix="/attendance-summaries",
    tags=["Attendance - Summaries"],
)


@router.post(
    "/",
    response_model=AttendanceSummaryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_attendance_summary(
    data: AttendanceSummaryCreate,
    db: Session = Depends(get_db),
):
    return attendance_summary_service.create(db, data)


@router.get(
    "/{attendance_summary_id}",
    response_model=AttendanceSummaryRead,
)
def get_attendance_summary(
    attendance_summary_id: int,
    db: Session = Depends(get_db),
):
    return attendance_summary_service.get(
        db,
        attendance_summary_id,
    )


@router.get(
    "/",
    response_model=list[AttendanceSummaryRead],
)
def list_attendance_summaries(db: Session = Depends(get_db)):
    return attendance_summary_service.get_all(db)


@router.put(
    "/{attendance_summary_id}",
    response_model=AttendanceSummaryRead,
)
def update_attendance_summary(
    attendance_summary_id: int,
    data: AttendanceSummaryUpdate,
    db: Session = Depends(get_db),
):
    return attendance_summary_service.update(
        db,
        attendance_summary_id,
        data,
    )


@router.delete(
    "/{attendance_summary_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_attendance_summary(
    attendance_summary_id: int,
    db: Session = Depends(get_db),
):
    attendance_summary_service.delete(
        db,
        attendance_summary_id,
    )
