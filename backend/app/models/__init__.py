from app.models.auth.role import Role
from app.models.auth.permission import Permission
from app.models.auth.user_account import UserAccount
from app.models.auth.role_permission import RolePermission
from app.models.auth.user_role import UserRole
from app.models.auth.login_audit import LoginAudit

from app.models.academic.department import Department
from app.models.academic.program import Program
from app.models.academic.semester import Semester
from app.models.academic.course import Course
from app.models.academic.section import Section
from app.models.academic.teacher import Teacher
from app.models.academic.student import Student
from app.models.academic.enrollment import Enrollment

# Attendance
from app.models.attendance.attendance_session import AttendanceSession
from app.models.attendance.attendance import Attendance
from app.models.attendance.attendance_summary import AttendanceSummary
from app.models.attendance.attendance_adjustment import AttendanceAdjustment
from app.models.attendance.attendance_audit_log import AttendanceAuditLog

# AI
from app.models.ai.face_registration import FaceRegistration
from app.models.ai.face_embedding import FaceEmbedding
from app.models.ai.recognition_session import RecognitionSession
from app.models.ai.recognition_result import RecognitionResult
from app.models.ai.face_verification_log import FaceVerificationLog