from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.crud.attendance.attendance_session import (
    attendance_session,
)
from app.models.academic.enrollment import Enrollment
from app.models.academic.section import Section
from app.models.academic.teacher import Teacher
from app.models.attendance.attendance import Attendance


class AttendanceSessionService:

    def __init__(self, db: Session):
        self.db = db
        self.crud = attendance_session

    # ========================================================
    # GET
    # ========================================================

    def get(self, attendance_session_id: int):
        return self.crud.get(
            self.db,
            attendance_session_id,
        )

    # ========================================================
    # LIST
    # ========================================================

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
    ):
        return self.crud.get_multi(
            self.db,
            skip=skip,
            limit=limit,
        )

    def list_sessions(
        self,
        skip: int = 0,
        limit: int = 100,
    ):
        return self.get_all(
            skip=skip,
            limit=limit,
        )

    # ========================================================
    # START ATTENDANCE SESSION
    # ========================================================

    def create(self, obj_in):

        teacher_id = obj_in.teacher_id
        course_id = obj_in.course_id
        section_id = obj_in.section_id

        # ----------------------------------------------------
        # 1. Verify teacher exists
        # ----------------------------------------------------

        teacher = self.db.scalar(
            select(Teacher).where(
                Teacher.teacher_id == teacher_id
            )
        )

        if teacher is None:
            raise ValueError(
                "Teacher not found."
            )

        # ----------------------------------------------------
        # 2. Verify teacher is active
        # ----------------------------------------------------

        if not teacher.is_active:
            raise ValueError(
                "This teacher account is inactive "
                "and cannot start attendance."
            )

        # ----------------------------------------------------
        # 3. Verify section exists
        # ----------------------------------------------------

        section = self.db.scalar(
            select(Section).where(
                Section.section_id == section_id
            )
        )

        if section is None:
            raise ValueError(
                "Selected section not found."
            )

        # ----------------------------------------------------
        # 4. Verify section belongs to selected course
        # ----------------------------------------------------

        if section.course_id != course_id:
            raise ValueError(
                "Selected section does not belong "
                "to the selected course."
            )

        # ----------------------------------------------------
        # 5. Verify teacher is assigned to section
        # ----------------------------------------------------

        if section.teacher_id != teacher_id:
            raise ValueError(
                "This teacher is not authorized "
                "to take attendance for the selected section."
            )

        # ----------------------------------------------------
        # 6. Backend controls today's date/time
        # ----------------------------------------------------

        now = datetime.now()
        today = now.date()
        current_time = now.time().replace(
            microsecond=0
        )

        # ----------------------------------------------------
        # 7. Prevent duplicate ACTIVE session today
        # ----------------------------------------------------

        existing_session = self.db.scalar(
            select(self.crud.model).where(
                self.crud.model.section_id == section_id,
                self.crud.model.teacher_id == teacher_id,
                self.crud.model.session_date == today,
                self.crud.model.session_status == "ACTIVE",
            )
        )

        if existing_session is not None:
            raise ValueError(
                "An active attendance session already exists "
                "for this section today."
            )

        # ----------------------------------------------------
        # 8. Calculate section roster
        # ----------------------------------------------------

        total_students = self.db.scalar(
            select(
                func.count(
                    Enrollment.enrollment_id
                )
            ).where(
                Enrollment.section_id == section_id,
                Enrollment.status == "ACTIVE",
            )
        )

        total_students = int(
            total_students or 0
        )

        # ----------------------------------------------------
        # 9. Create ACTIVE session
        # ----------------------------------------------------

        session = self.crud.model(
            section_id=section_id,
            teacher_id=teacher_id,
            session_date=today,
            start_time=current_time,
            end_time=None,
            session_status="ACTIVE",
            total_students=total_students,
            present_students=0,
            absent_students=0,
            late_students=0,
            created_at=now,
            updated_at=now,
        )

        self.db.add(session)

        try:
            self.db.commit()
            self.db.refresh(session)

        except Exception:
            self.db.rollback()
            raise

        return session

    # ========================================================
    # FINALIZE ATTENDANCE SESSION
    # ========================================================

    def finalize(
        self,
        attendance_session_id: int,
    ):
        """
        Finalize an active attendance session.

        Workflow:

            ACTIVE SESSION
                  ↓
            Section roster
                  ↓
            Existing attendance
                  ↓
            Missing students
                  ↓
            Mark missing students ABSENT
                  ↓
            Update counters
                  ↓
            Session COMPLETED
        """

        # ----------------------------------------------------
        # 1. Load session
        # ----------------------------------------------------

        session = self.get(
            attendance_session_id
        )

        if session is None:
            raise ValueError(
                "Attendance session not found."
            )

        # ----------------------------------------------------
        # 2. Prevent finalizing an already completed session
        # ----------------------------------------------------

        if session.session_status != "ACTIVE":
            raise ValueError(
                "This attendance session is already finalized."
            )

        # ----------------------------------------------------
        # 3. Session must belong to today
        # ----------------------------------------------------

        now = datetime.now()
        today = now.date()

        if session.session_date != today:
            raise ValueError(
                "Only today's attendance session can be finalized."
            )

        # ----------------------------------------------------
        # 4. Get ACTIVE section roster
        # ----------------------------------------------------

        roster_statement = (
            select(Enrollment.student_id)
            .where(
                Enrollment.section_id
                == session.section_id,
                Enrollment.status == "ACTIVE",
            )
        )

        roster_student_ids = set(
            self.db.scalars(
                roster_statement
            ).all()
        )

        # ----------------------------------------------------
        # 5. Safety check
        # ----------------------------------------------------

        if not roster_student_ids:
            raise ValueError(
                "This section has no active enrolled students."
            )

        # ----------------------------------------------------
        # 6. Get attendance already recorded
        #    for THIS exact session
        # ----------------------------------------------------

        attendance_statement = (
            select(Attendance)
            .where(
                Attendance.attendance_session_id
                == attendance_session_id,
                Attendance.student_id.in_(
                    roster_student_ids
                ),
            )
        )

        existing_records = list(
            self.db.scalars(
                attendance_statement
            ).all()
        )

        present_student_ids = {
            record.student_id
            for record in existing_records
            if record.attendance_status
            in {"Present", "Late"}
        }

        # ----------------------------------------------------
        # 7. Determine missing students
        # ----------------------------------------------------

        absent_student_ids = (
            roster_student_ids
            - present_student_ids
        )

        # ----------------------------------------------------
        # 8. Create ABSENT records
        # ----------------------------------------------------

        for student_id in absent_student_ids:

            absent_record = Attendance(
                attendance_session_id=(
                    attendance_session_id
                ),
                student_id=student_id,
                attendance_status="Absent",
                check_in_time=None,
                confidence_score=None,
                verification_method="Session Finalization",
                remarks=(
                    "Student was not recognized "
                    "during the attendance session."
                ),
                created_at=now,
                updated_at=now,
            )

            self.db.add(absent_record)

        # ----------------------------------------------------
        # 9. Calculate final counters
        # ----------------------------------------------------

        total_students = len(
            roster_student_ids
        )

        present_students = len(
            present_student_ids
        )

        absent_students = len(
            absent_student_ids
        )

        # ----------------------------------------------------
        # 10. Complete session
        # ----------------------------------------------------

        session.total_students = total_students
        session.present_students = present_students
        session.absent_students = absent_students
        session.late_students = sum(
            1
            for record in existing_records
            if record.attendance_status == "Late"
        )
        session.end_time = now.time().replace(
            microsecond=0
        )
        session.session_status = "COMPLETED"
        session.updated_at = now

        self.db.add(session)

        # ----------------------------------------------------
        # 11. Commit EVERYTHING atomically
        # ----------------------------------------------------

        try:
            self.db.commit()
            self.db.refresh(session)

        except Exception:
            self.db.rollback()
            raise

        return session

    # ========================================================
    # UPDATE
    # ========================================================

    def update(
        self,
        attendance_session_id: int,
        obj_in,
    ):

        db_obj = self.get(
            attendance_session_id
        )

        if db_obj is None:
            return None

        return self.crud.update(
            self.db,
            db_obj=db_obj,
            obj_in=obj_in,
        )

    # ========================================================
    # DELETE
    # ========================================================

    def delete(
        self,
        attendance_session_id: int,
    ):

        db_obj = self.get(
            attendance_session_id
        )

        if db_obj is None:
            return None

        return self.crud.remove(
            self.db,
            id=attendance_session_id,
        )