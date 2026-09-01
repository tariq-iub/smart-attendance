from sqlalchemy import text
from app.database.connection import engine


def one(db, sql, params=None):
    return db.execute(text(sql), params or {}).scalar_one()


with engine.begin() as db:

    # =========================================================
    # 1. DEPARTMENT
    # =========================================================
    department = db.execute(text("""
        SELECT department_id
        FROM academic.department
        LIMIT 1
    """)).scalar()

    if department is None:
        department = one(db, """
            INSERT INTO academic.department
            (department_name, department_code, created_at, updated_at)
            VALUES
            ('Computer Science', 'CS', NOW(), NOW())
            RETURNING department_id
        """)

    # =========================================================
    # 2. PROGRAM
    # =========================================================
    program = db.execute(text("""
        SELECT program_id
        FROM academic.program
        LIMIT 1
    """)).scalar()

    if program is None:
        program = one(db, """
            INSERT INTO academic.program
            (department_id, program_name, program_code,
             duration_years, created_at, updated_at)
            VALUES
            (:department_id, 'BS Computer Science', 'BSCS',
             4, NOW(), NOW())
            RETURNING program_id
        """, {
            "department_id": department
        })

    # =========================================================
    # 3. SEMESTER
    # =========================================================
    semester = db.execute(text("""
        SELECT semester_id
        FROM academic.semester
        LIMIT 1
    """)).scalar()

    if semester is None:
        semester = one(db, """
            INSERT INTO academic.semester
            (program_id, semester_number, semester_name,
             is_active, created_at, updated_at)
            VALUES
            (:program_id, 1, 'Semester 1',
             TRUE, NOW(), NOW())
            RETURNING semester_id
        """, {
            "program_id": program
        })

    # =========================================================
    # 4. TEACHER
    # =========================================================
    teacher = db.execute(text("""
        SELECT teacher_id
        FROM academic.teacher
        LIMIT 1
    """)).scalar()

    if teacher is None:
        teacher = one(db, """
            INSERT INTO academic.teacher
            (department_id, teacher_code, first_name, last_name,
             email, phone, designation, is_active,
             created_at, updated_at)
            VALUES
            (:department_id, 'T001', 'Demo', 'Teacher',
             'teacher@demo.com', '03000000000',
             'Lecturer', TRUE, NOW(), NOW())
            RETURNING teacher_id
        """, {
            "department_id": department
        })

    # =========================================================
    # 5. COURSE
    # =========================================================
    course = db.execute(text("""
        SELECT course_id
        FROM academic.course
        LIMIT 1
    """)).scalar()

    if course is None:
        course = one(db, """
            INSERT INTO academic.course
            (program_id, semester_id, course_name, course_code,
             credit_hours, is_lab, created_at, updated_at)
            VALUES
            (:program_id, :semester_id,
             'Artificial Intelligence', 'AI101',
             3, FALSE, NOW(), NOW())
            RETURNING course_id
        """, {
            "program_id": program,
            "semester_id": semester
        })

    # =========================================================
    # 6. SECTION
    # =========================================================
    section = db.execute(text("""
        SELECT section_id
        FROM academic.section
        LIMIT 1
    """)).scalar()

    if section is None:
        section = one(db, """
            INSERT INTO academic.section
            (course_id, teacher_id, section_name,
             room_number, max_students,
             created_at, updated_at)
            VALUES
            (:course_id, :teacher_id, 'A',
             'Lab-1', 50,
             NOW(), NOW())
            RETURNING section_id
        """, {
            "course_id": course,
            "teacher_id": teacher
        })

    # =========================================================
    # 7. STUDENT
    # =========================================================
    student = db.execute(text("""
        SELECT student_id
        FROM academic.student
        WHERE registration_no = 'DEMO001'
        LIMIT 1
    """)).scalar()

    if student is None:
        student = one(db, """
            INSERT INTO academic.student
            (program_id, semester_id, registration_no,
             first_name, last_name, email, phone, gender,
             date_of_birth, admission_year, current_status,
             is_active, created_at, updated_at)
            VALUES
            (:program_id, :semester_id, 'DEMO001',
             'Demo', 'Student', 'student@demo.com',
             '03000000000', 'Male',
             '2003-01-01', 2026, 'active',
             TRUE, NOW(), NOW())
            RETURNING student_id
        """, {
            "program_id": program,
            "semester_id": semester
        })

    # =========================================================
    # 8. ATTENDANCE SESSION
    # =========================================================
    session_id = db.execute(text("""
        SELECT attendance_session_id
        FROM attendance.attendance_session
        WHERE section_id = :section_id
          AND session_date = CURRENT_DATE
        LIMIT 1
    """), {
        "section_id": section
    }).scalar()

    if session_id is None:
        session_id = one(db, """
            INSERT INTO attendance.attendance_session
            (section_id, teacher_id, session_date,
             start_time, session_status,
             total_students, present_students,
             absent_students, late_students,
             created_at, updated_at)
            VALUES
            (:section_id, :teacher_id, CURRENT_DATE,
             CURRENT_TIME, 'active',
             1, 0, 1, 0,
             NOW(), NOW())
            RETURNING attendance_session_id
        """, {
            "section_id": section,
            "teacher_id": teacher
        })

    # =========================================================
    # DONE
    # =========================================================
    print()
    print("======================================")
    print("SMART ATTENDANCE DEMO DATA READY")
    print("======================================")
    print("Department :", department)
    print("Program    :", program)
    print("Semester   :", semester)
    print("Teacher    :", teacher)
    print("Course     :", course)
    print("Section    :", section)
    print("Student    :", student)
    print("Session    :", session_id)
    print("Registration No: DEMO001")
    print("======================================")