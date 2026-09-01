import AcademicSetup from "./AcademicSetup";
import TeacherAttendance from "./TeacherAttendance";
import Courses from "./Courses";
import { apiRequest, normalizeList as normalizeApiList } from "./api";
import { useEffect, useMemo, useState } from "react";
import FaceRecognition from "./FaceRecognition";
import Students from "./Students";
import "./App.css";

const normalizeList = normalizeApiList;
const asArray = (value) => {
  if (Array.isArray(value)) return value;
  return [];
};

/* ================= HELPERS ================= */

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(person) {
  if (!person) return "?";

  const first = person.first_name || "";
  const last = person.last_name || "";

  const initials = `${first.charAt(0)}${last.charAt(0)}`.trim();

  return initials || "ST";
}

function getPersonName(person, fallback = "Unknown") {
  if (!person) return fallback;

  return (
    `${person.first_name || ""} ${person.last_name || ""}`.trim() ||
    fallback
  );
}

/* ================= FORM MODAL ================= */

function FormModal({
  title,
  children,
  onClose,
  onSubmit,
  saving,
  error,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          width: "100%",
          maxWidth: "720px",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ margin: 0 }}>{title}</h2>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "#f1f5f9",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "18px",
              fontSize: "13px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          {children}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "25px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "11px 20px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "11px 22px",
                border: "none",
                background: "#2563eb",
                color: "#fff",
                borderRadius: "8px",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                fontWeight: 600,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================= FORM FIELD ================= */

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}) {
  return (
    <div style={{ marginBottom: "15px" }}>
      <label
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "6px",
          color: "#334155",
        }}
      >
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "11px 12px",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          outline: "none",
          fontSize: "14px",
        }}
      />
    </div>
  );
}

/* ================= APP ================= */

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
     const menuItems = [
  { name: "Dashboard", icon: "▦" },
  { name: "Academic Setup", icon: "🏛️" },
  { name: "Students", icon: "🎓" },
  { name: "Teachers", icon: "👨‍🏫" },
  { name: "Courses", icon: "📚" },
  { name: "Attendance", icon: "✓" },
  { name: "Teacher Attendance", icon: "📷" },
  { name: "Face Recognition", icon: "◉" },
  { name: "Reports", icon: "▤" },
];

  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  /* CRUD MODAL STATE */

  const [studentModal, setStudentModal] = useState(false);
  const [teacherModal, setTeacherModal] = useState(false);

  const [editingStudent, setEditingStudent] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);

  const [savingStudent, setSavingStudent] = useState(false);
  const [savingTeacher, setSavingTeacher] = useState(false);

  const [formError, setFormError] = useState("");

  /* ================= FORM DATA ================= */

  const emptyStudent = {
    program_id: "1",
    semester_id: "3",
    registration_no: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    gender: "male",
    date_of_birth: "",
    admission_year: new Date().getFullYear(),
    current_status: "present",
    is_active: true,
  };

  const emptyTeacher = {
    department_id: "1",
    teacher_code: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    designation: "",
    is_active: true,
  };

  const [studentForm, setStudentForm] = useState(emptyStudent);
  const [teacherForm, setTeacherForm] = useState(emptyTeacher);

  /* ================= LOAD DATA ================= */

  const loadData = async () => {
    setLoading(true);
    setApiError("");

    const results = await Promise.allSettled([
      apiRequest("/students/"),
      apiRequest("/teachers/"),
      apiRequest("/attendance/"),
      apiRequest("/attendance-sessions/"),
    ]);

    const [
      studentsResult,
      teachersResult,
      attendanceResult,
      sessionsResult,
    ] = results;

    const failed = [];

    if (studentsResult.status === "fulfilled") {
      setStudents(asArray(studentsResult.value));
    } else {
      failed.push("students");
    }

    if (teachersResult.status === "fulfilled") {
      setTeachers(asArray(teachersResult.value));
    } else {
      failed.push("teachers");
    }

    if (attendanceResult.status === "fulfilled") {
      setAttendance(asArray(attendanceResult.value));
    } else {
      failed.push("attendance");
    }

    if (sessionsResult.status === "fulfilled") {
      setSessions(asArray(sessionsResult.value));
    } else {
      failed.push("attendance sessions");
    }

    if (failed.length > 0) {
      setApiError(
        `Could not load: ${failed.join(
          ", "
        )}. Other available data is still displayed.`
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ================= STUDENT CRUD ================= */

  const openAddStudent = () => {
    setEditingStudent(null);
    setStudentForm(emptyStudent);
    setFormError("");
    setStudentModal(true);
  };

  const openEditStudent = (student) => {
    setEditingStudent(student);
    setFormError("");

    setStudentForm({
      program_id: String(student.program_id ?? ""),
      semester_id: String(student.semester_id ?? ""),
      registration_no: student.registration_no ?? "",
      first_name: student.first_name ?? "",
      last_name: student.last_name ?? "",
      email: student.email ?? "",
      phone: student.phone ?? "",
      gender: student.gender ?? "male",
      date_of_birth: student.date_of_birth
        ? String(student.date_of_birth).slice(0, 10)
        : "",
      admission_year: student.admission_year ?? "",
      current_status: student.current_status ?? "present",
      is_active: Boolean(student.is_active),
    });

    setStudentModal(true);
  };

  const handleStudentChange = (event) => {
    const { name, value, type, checked } = event.target;

    setStudentForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const saveStudent = async (event) => {
    event.preventDefault();

    setSavingStudent(true);
    setFormError("");

    const payload = {
      program_id: Number(studentForm.program_id),
      semester_id: Number(studentForm.semester_id),
      registration_no: studentForm.registration_no.trim(),
      first_name: studentForm.first_name.trim(),
      last_name: studentForm.last_name.trim(),
      email: studentForm.email.trim(),
      phone: studentForm.phone.trim() || null,
      gender: studentForm.gender,
      date_of_birth: studentForm.date_of_birth || null,
      admission_year: Number(studentForm.admission_year),
      current_status: studentForm.current_status,
      is_active: Boolean(studentForm.is_active),
    };

    try {
      if (editingStudent) {
        await apiRequest(
          `/students/${editingStudent.student_id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      } else {
        await apiRequest("/students/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setStudentModal(false);
      setEditingStudent(null);
      setStudentForm(emptyStudent);

      await loadData();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSavingStudent(false);
    }
  };

  const deleteStudent = async (student) => {
    const name = getPersonName(student, "this student");

    const confirmed = window.confirm(
      `Delete ${name}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await apiRequest(
        `/students/${student.student_id}`,
        {
          method: "DELETE",
        }
      );

      await loadData();
    } catch (error) {
      setApiError(`Could not delete student: ${error.message}`);
    }
  };

  /* ================= TEACHER CRUD ================= */

  const openAddTeacher = () => {
    setEditingTeacher(null);
    setTeacherForm(emptyTeacher);
    setFormError("");
    setTeacherModal(true);
  };

  const openEditTeacher = (teacher) => {
    setEditingTeacher(teacher);
    setFormError("");

    setTeacherForm({
      department_id: String(teacher.department_id ?? ""),
      teacher_code: teacher.teacher_code ?? "",
      first_name: teacher.first_name ?? "",
      last_name: teacher.last_name ?? "",
      email: teacher.email ?? "",
      phone: teacher.phone ?? "",
      designation: teacher.designation ?? "",
      is_active: Boolean(teacher.is_active),
    });

    setTeacherModal(true);
  };

  const handleTeacherChange = (event) => {
    const { name, value, type, checked } = event.target;

    setTeacherForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const saveTeacher = async (event) => {
    event.preventDefault();

    setSavingTeacher(true);
    setFormError("");

    const payload = {
      department_id: Number(teacherForm.department_id),
      teacher_code: teacherForm.teacher_code.trim(),
      first_name: teacherForm.first_name.trim(),
      last_name: teacherForm.last_name.trim(),
      email: teacherForm.email.trim(),
      phone: teacherForm.phone.trim() || null,
      designation: teacherForm.designation.trim(),
      is_active: Boolean(teacherForm.is_active),
    };

    try {
      if (editingTeacher) {
        await apiRequest(
          `/teachers/${editingTeacher.teacher_id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      } else {
        await apiRequest("/teachers/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setTeacherModal(false);
      setEditingTeacher(null);
      setTeacherForm(emptyTeacher);

      await loadData();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSavingTeacher(false);
    }
  };

  const deleteTeacher = async (teacher) => {
    const name = getPersonName(teacher, "this teacher");

    const confirmed = window.confirm(
      `Delete ${name}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await apiRequest(
        `/teachers/${teacher.teacher_id}`,
        {
          method: "DELETE",
        }
      );

      await loadData();
    } catch (error) {
      setApiError(`Could not delete teacher: ${error.message}`);
    }
  };

  /* ================= DASHBOARD DATA ================= */

  const studentMap = useMemo(() => {
    const map = {};

    students.forEach((student) => {
      map[student.student_id] = student;
    });

    return map;
  }, [students]);

  const presentCount = useMemo(
    () =>
      attendance.filter(
        (record) =>
          String(record.attendance_status || "").toLowerCase() ===
          "present"
      ).length,
    [attendance]
  );

  const absentCount = useMemo(
    () =>
      attendance.filter(
        (record) =>
          String(record.attendance_status || "").toLowerCase() ===
          "absent"
      ).length,
    [attendance]
  );

  const lateCount = useMemo(
    () =>
      attendance.filter(
        (record) =>
          String(record.attendance_status || "").toLowerCase() ===
          "late"
      ).length,
    [attendance]
  );

  const recordedCount = attendance.length;

  const attendancePercentage =
    recordedCount > 0
      ? ((presentCount / recordedCount) * 100).toFixed(1)
      : "0.0";

  const activeSessionCount = sessions.filter((session) => {
    const status = String(
      session.session_status || ""
    ).toLowerCase();

    return [
      "active",
      "open",
      "running",
      "in_progress",
    ].includes(status);
  }).length;

  const recentAttendance = [...attendance]
    .sort((a, b) => {
      const dateA = new Date(
        a.check_in_time || a.created_at || 0
      ).getTime();

      const dateB = new Date(
        b.check_in_time || b.created_at || 0
      ).getTime();

      return dateB - dateA;
    })
    .slice(0, 10);

  /* ================= RENDER ================= */

  return (
    <div className="app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="logo">
          <div className="logo-icon">SA</div>

          <div>
            <h2>Smart Attendance</h2>
            <span>University System</span>
          </div>
        </div>

        <div className="menu-title">MAIN MENU</div>

        <nav>
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`menu-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="menu-icon">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">

          <div className="system-status">
            <span className="status-dot"></span>

            <div>
              <strong>System Online</strong>
              <small>FastAPI + PostgreSQL</small>
            </div>
          </div>

          <div className="user-box">
            <div className="avatar">A</div>

            <div>
              <strong>Administrator</strong>
              <small>Super Admin</small>
            </div>
          </div>

        </div>
      </aside>

      {/* MAIN */}

      <main className="main">

        <header className="header">

          <div>
            <h1>{activePage}</h1>

            <p>
              {activePage === "Dashboard"
                ? "Welcome back to Smart Attendance System"
                : `${activePage} management`}
            </p>
          </div>

          <div className="header-right">

            <button
              className="notification"
              onClick={loadData}
              title="Refresh data"
            >
              🔄
            </button>

            <div className="profile">

              <div className="avatar">A</div>

              <div>
                <strong>Administrator</strong>
                <small>Super Admin</small>
              </div>

            </div>
          </div>

        </header>

        {apiError && (
          <div
            style={{
              background: "#fff7ed",
              color: "#c2410c",
              border: "1px solid #fed7aa",
              borderRadius: "10px",
              padding: "12px 15px",
              marginBottom: "20px",
              fontSize: "13px",
            }}
          >
            ⚠️ {apiError}
          </div>
        )}

        {loading && (
          <div
            className="card"
            style={{
              marginBottom: "20px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            Loading live data from FastAPI...
          </div>
        )}

        {/* ================= DASHBOARD ================= */}

        {activePage === "Dashboard" && (
          <>
            <section className="stats">

              <div className="stat-card">
                <div className="stat-icon blue">👨‍🎓</div>

                <div>
                  <span>Total Students</span>
                  <h2>{students.length}</h2>
                  <small>{teachers.length} teachers · live database</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">✓</div>

                <div>
                  <span>Recorded Attendance</span>
                  <h2>{attendancePercentage}%</h2>

                  <small>
                    {presentCount} present of {recordedCount} records
                  </small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon purple">✓</div>

                <div>
                  <span>Attendance Records</span>
                  <h2>{attendance.length}</h2>
                  <small>From attendance database</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">📚</div>

                <div>
                  <span>Active Sessions</span>
                  <h2>{activeSessionCount}</h2>

                  <small>
                    {sessions.length} total session
                    {sessions.length === 1 ? "" : "s"}
                  </small>
                </div>
              </div>

            </section>

            <section className="dashboard-grid">

              <div className="card attendance-card">

                <div className="card-header">

                  <div>
                    <h3>Attendance Overview</h3>
                    <p>Live data from attendance API</p>
                  </div>

                  <button
                    className="view-button"
                    onClick={() => setActivePage("Attendance")}
                  >
                    View All
                  </button>

                </div>

                <div className="attendance-content">

                  <div
                    className="attendance-circle"
                    style={{
                      background: `conic-gradient(#2563eb ${attendancePercentage}%, #e5e7eb 0)`,
                    }}
                  >
                    <div>
                      <strong>{attendancePercentage}%</strong>
                      <span>Present</span>
                    </div>
                  </div>

                  <div className="attendance-details">

                    <div className="attendance-row">
                      <span>
                        <i className="dot present"></i>
                        Present
                      </span>
                      <strong>{presentCount}</strong>
                    </div>

                    <div className="attendance-row">
                      <span>
                        <i className="dot absent"></i>
                        Absent
                      </span>
                      <strong>{absentCount}</strong>
                    </div>

                    <div className="attendance-row">
                      <span>
                        <i className="dot late"></i>
                        Late
                      </span>
                      <strong>{lateCount}</strong>
                    </div>

                  </div>
                </div>
              </div>

              <div className="card ai-card">

                <div className="card-header">

                  <div>
                    <h3>AI Face Recognition</h3>
                    <p>Live recognition system</p>
                  </div>

                  <span className="live-badge">
                    <span></span>
                    LIVE
                  </span>

                </div>

                <div className="camera-placeholder">

                  <div className="camera-icon">◉</div>

                  <h3>Face Recognition Ready</h3>

                  <p>
                    Start an attendance session to begin
                    automatic face recognition.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() =>
                      setActivePage("Face Recognition")
                    }
                  >
                    Start Recognition
                  </button>

                </div>
              </div>

            </section>
          </>
        )}

        {/* ================= STUDENTS ================= */}

        {/* ================= STUDENTS ================= */}

        {activePage === "Students" && (
          <Students />
        )}

        {/* ================= TEACHERS ================= */}

        {activePage === "Teachers" && (
          <section className="card recent-card">

            <div className="card-header">

              <div>
                <h3>Teachers</h3>

                <p>
                  {teachers.length} teacher
                  {teachers.length === 1 ? "" : "s"} loaded from
                  FastAPI
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                }}
              >

                <button
                  className="view-button"
                  onClick={loadData}
                >
                  🔄 Refresh
                </button>

                <button
                  className="primary-button"
                  onClick={openAddTeacher}
                >
                  + Add Teacher
                </button>

              </div>

            </div>

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Teacher Code</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Designation</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {teachers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        style={{ textAlign: "center" }}
                      >
                        No teachers returned by the API.
                      </td>
                    </tr>
                  ) : (
                    teachers.map((teacher) => (
                      <tr key={teacher.teacher_id}>

                        <td>
                          <div className="student">

                            <div className="student-avatar">
                              {getInitials(teacher)}
                            </div>

                            {getPersonName(
                              teacher,
                              "Unknown Teacher"
                            )}

                          </div>
                        </td>

                        <td>
                          {teacher.teacher_code || "—"}
                        </td>

                        <td>{teacher.email || "—"}</td>

                        <td>{teacher.phone || "—"}</td>

                        <td>
                          {teacher.designation || "—"}
                        </td>

                        <td>
                          {teacher.department_id || "—"}
                        </td>

                        <td>
                          <span className="status present-status">
                            {teacher.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td>

                          <div
                            style={{
                              display: "flex",
                              gap: "7px",
                            }}
                          >

                            <button
                              onClick={() =>
                                openEditTeacher(teacher)
                              }
                              style={{
                                border: "none",
                                background: "#eff6ff",
                                color: "#2563eb",
                                padding: "7px 11px",
                                borderRadius: "6px",
                                cursor: "pointer",
                              }}
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                deleteTeacher(teacher)
                              }
                              style={{
                                border: "none",
                                background: "#fff1f2",
                                color: "#dc2626",
                                padding: "7px 11px",
                                borderRadius: "6px",
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>
                    ))
                  )}

                </tbody>

              </table>

            </div>
          </section>
        )}

        {/* ================= ATTENDANCE ================= */}

        {activePage === "Attendance" && (
          <section className="card recent-card">

            <div className="card-header">

              <div>
  <h3>Attendance Records</h3>

  <p>
    Live attendance records from PostgreSQL
  </p>

  <div
    style={{
      display: "flex",
      gap: "12px",
      marginTop: "10px",
      fontSize: "13px",
      color: "#64748b",
    }}
  >
    <span>
      <strong>Date:</strong>{" "}
      {new Date().toLocaleDateString("en-GB")}
    </span>

    <span>
      <strong>Day:</strong>{" "}
      {new Date().toLocaleDateString("en-US", {
        weekday: "long",
      })}
    </span>
  </div>
</div>

              <button
                className="view-button"
                onClick={loadData}
              >
                Refresh
              </button>

            </div>

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Session</th>
                    <th>Status</th>
                    <th>Attendance Time</th>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Confidence</th>
                    <th>Method</th>
                  </tr>
                </thead>

                <tbody>

                  {attendance.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        style={{ textAlign: "center" }}
                      >
                        No attendance records found.
                      </td>
                    </tr>
                  ) : (
                    attendance.map((record) => {

                      const student =
                        studentMap[record.student_id];

                      const status = String(
                        record.attendance_status || "unknown"
                      );

                      return (
                        <tr key={record.attendance_id}>

                          <td>
                            <div className="student">

                              <div className="student-avatar">
                                {getInitials(student)}
                              </div>

                              {getPersonName(
                                student,
                                "Unknown Student"
                              )}

                            </div>
                          </td>

                          <td>
                            #{record.attendance_session_id}
                          </td>

                          <td>
                            <span
                              className={`status ${
                                status.toLowerCase() === "present"
                                  ? "present-status"
                                  : ""
                              }`}
                            >
                              {status.charAt(0).toUpperCase() +
                                status.slice(1)}
                            </span>
                          </td>

                          <td>
  {formatTime(
    record.check_in_time ||
      record.created_at
  )}
</td>

<td>
  {new Date(
    record.check_in_time ||
      record.created_at
  ).toLocaleDateString("en-GB")}
</td>

<td>
  {new Date(
    record.check_in_time ||
      record.created_at
  ).toLocaleDateString("en-US", {
    weekday: "long",
  })}
</td>

                          <td>
                            {record.confidence_score != null
                              ? `${record.confidence_score}%`
                              : "—"}
                          </td>

                          <td>
                            {record.verification_method || "—"}
                          </td>

                        </tr>
                      );
                    })
                  )}

                </tbody>

              </table>

            </div>
          </section>
        )}

        {/* ================= OTHER PAGES ================= */}

          {activePage === "Courses" && (
             <Courses />
        )}
         

        {activePage === "Face Recognition" && (
  <FaceRecognition />
)}
        {activePage === "Teacher Attendance" && (
  <TeacherAttendance />
)}
        {activePage === "Reports" && (
          <div className="card empty-page">
            <div className="empty-icon">▤</div>

            <h2>Reports & Analytics</h2>

            <p>
              Attendance analytics and report generation will be
              implemented here.
            </p>

            <button
              className="primary-button"
              onClick={() => setActivePage("Dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        )}

      </main>

      {/* ================= ADD / EDIT TEACHER MODAL ================= */}

      {teacherModal && (
        <FormModal
          title={
            editingTeacher
              ? "Edit Teacher"
              : "Add New Teacher"
          }
          onClose={() => {
            setTeacherModal(false);
            setFormError("");
          }}
          onSubmit={saveTeacher}
          saving={savingTeacher}
          error={formError}
        >

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
            }}
          >

            <Field
              label="Department ID"
              name="department_id"
              type="number"
              value={teacherForm.department_id}
              onChange={handleTeacherChange}
              required
            />

            <Field
              label="Teacher Code"
              name="teacher_code"
              value={teacherForm.teacher_code}
              onChange={handleTeacherChange}
              required
              placeholder="e.g. T-001"
            />

            <Field
              label="First Name"
              name="first_name"
              value={teacherForm.first_name}
              onChange={handleTeacherChange}
              required
            />

            <Field
              label="Last Name"
              name="last_name"
              value={teacherForm.last_name}
              onChange={handleTeacherChange}
              required
            />

            <Field
              label="Email"
              name="email"
              type="email"
              value={teacherForm.email}
              onChange={handleTeacherChange}
              required
            />

            <Field
              label="Phone"
              name="phone"
              value={teacherForm.phone}
              onChange={handleTeacherChange}
              placeholder="+923001234567"
            />

            <div style={{ gridColumn: "1 / -1" }}>
              <Field
                label="Designation"
                name="designation"
                value={teacherForm.designation}
                onChange={handleTeacherChange}
                required
                placeholder="e.g. Lecturer"
              />
            </div>

          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              name="is_active"
              checked={teacherForm.is_active}
              onChange={handleTeacherChange}
            />

            Active Teacher
          </label>

        </FormModal>
      )}

    </div>
  );
}

export default App;