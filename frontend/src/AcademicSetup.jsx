import "./AcademicSetup.css";
import { useEffect, useMemo, useState } from "react";
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

const EMPTY_DEPARTMENT = {
  department_name: "",
  department_code: "",
};

const EMPTY_PROGRAM = {
  department_id: "",
  program_name: "",
  program_code: "",
  duration_years: 4,
};

const EMPTY_SEMESTER = {
  program_id: "",
  semester_number: 1,
  semester_name: "Semester 1",
  is_active: true,
};

const ordinal = (number) => {
  const n = Number(number);

  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";

  return `${n}th`;
};

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail =
      data?.detail ||
      data?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(
      typeof detail === "string"
        ? detail
        : JSON.stringify(detail)
    );
  }

  return data;
}

export default function AcademicSetup() {
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [modal, setModal] = useState(null);

  const [departmentForm, setDepartmentForm] =
    useState(EMPTY_DEPARTMENT);

  const [programForm, setProgramForm] =
    useState(EMPTY_PROGRAM);

  const [semesterForm, setSemesterForm] =
    useState(EMPTY_SEMESTER);

  const [editingDepartment, setEditingDepartment] =
    useState(null);

  const [editingProgram, setEditingProgram] =
    useState(null);

  const [editingSemester, setEditingSemester] =
    useState(null);

  // =========================================================
  // LOAD DATA
  // =========================================================

  const loadAcademicData = async () => {
    setLoading(true);

    try {
      const [departmentData, programData, semesterData] =
        await Promise.all([
          apiRequest("/departments/"),
          apiRequest("/programs/"),
          apiRequest("/semesters/"),
        ]);

      setDepartments(
        Array.isArray(departmentData)
          ? departmentData
          : []
      );

      setPrograms(
        Array.isArray(programData)
          ? programData
          : []
      );

      setSemesters(
        Array.isArray(semesterData)
          ? semesterData
          : []
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not load academic setup data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcademicData();
  }, []);

  // =========================================================
  // HELPERS
  // =========================================================

  const showSuccess = (text) => {
    setError("");
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 4000);
  };

  const showError = (text) => {
    setMessage("");
    setError(text);

    setTimeout(() => {
      setError("");
    }, 5000);
  };

  const closeModal = () => {
    setModal(null);

    setEditingDepartment(null);
    setEditingProgram(null);
    setEditingSemester(null);

    setDepartmentForm(EMPTY_DEPARTMENT);
    setProgramForm(EMPTY_PROGRAM);
    setSemesterForm(EMPTY_SEMESTER);
  };

  const getDepartmentName = (departmentId) => {
    const department = departments.find(
      (item) =>
        Number(item.department_id) ===
        Number(departmentId)
    );

    return department?.department_name || "—";
  };

  const getProgramName = (programId) => {
    const program = programs.find(
      (item) =>
        Number(item.program_id) ===
        Number(programId)
    );

    return program?.program_name || "—";
  };

  const getProgramSemesterCount = (programId) => {
    return semesters.filter(
      (semester) =>
        Number(semester.program_id) ===
        Number(programId)
    ).length;
  };

  // =========================================================
  // DEPARTMENT CRUD
  // =========================================================

  const openAddDepartment = () => {
    setDepartmentForm(EMPTY_DEPARTMENT);
    setEditingDepartment(null);
    setModal("department");
  };

  const openEditDepartment = (department) => {
    setEditingDepartment(department);

    setDepartmentForm({
      department_name:
        department.department_name || "",
      department_code:
        department.department_code || "",
    });

    setModal("department");
  };

  const saveDepartment = async (event) => {
    event.preventDefault();

    const name =
      departmentForm.department_name.trim();

    const code =
      departmentForm.department_code.trim();

    if (!name || !code) {
      showError(
        "Department name and department code are required."
      );
      return;
    }

    const duplicate = departments.find(
      (department) =>
        department.department_name
          .trim()
          .toLowerCase() ===
          name.toLowerCase() &&
        Number(department.department_id) !==
          Number(
            editingDepartment?.department_id
          )
    );

    if (duplicate) {
      showError(
        "A department with this name already exists."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        department_name: name,
        department_code: code,
      };

      if (editingDepartment) {
        await apiRequest(
          `/departments/${editingDepartment.department_id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        showSuccess(
          `Department "${name}" updated successfully.`
        );
      } else {
        await apiRequest("/departments/", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        showSuccess(
          `Department "${name}" created successfully.`
        );
      }

      await loadAcademicData();
      closeModal();
    } catch (err) {
      showError(
        err.message ||
          "Could not save department."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteDepartment = async (department) => {
    const relatedPrograms = programs.filter(
      (program) =>
        Number(program.department_id) ===
        Number(department.department_id)
    );

    if (relatedPrograms.length > 0) {
      showError(
        "This department has programs. Delete or move its programs first."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete department "${department.department_name}"?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await apiRequest(
        `/departments/${department.department_id}`,
        {
          method: "DELETE",
        }
      );

      await loadAcademicData();

      showSuccess(
        `Department "${department.department_name}" deleted successfully.`
      );
    } catch (err) {
      showError(
        err.message ||
          "Could not delete department."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // PROGRAM CRUD
  // =========================================================

  const openAddProgram = () => {
    setProgramForm({
      ...EMPTY_PROGRAM,
      department_id:
        departments.length === 1
          ? String(departments[0].department_id)
          : "",
    });

    setEditingProgram(null);
    setModal("program");
  };

  const openEditProgram = (program) => {
    setEditingProgram(program);

    setProgramForm({
      department_id: String(
        program.department_id
      ),
      program_name:
        program.program_name || "",
      program_code:
        program.program_code || "",
      duration_years:
        program.duration_years || 4,
    });

    setModal("program");
  };

  const saveProgram = async (event) => {
    event.preventDefault();

    if (!programForm.department_id) {
      showError(
        "Please select a department."
      );
      return;
    }

    const name =
      programForm.program_name.trim();

    const code =
      programForm.program_code.trim();

    if (!name || !code) {
      showError(
        "Program name and program code are required."
      );
      return;
    }

    const duplicate = programs.find(
      (program) =>
        program.program_name
          .trim()
          .toLowerCase() ===
          name.toLowerCase() &&
        Number(program.program_id) !==
          Number(
            editingProgram?.program_id
          )
    );

    if (duplicate) {
      showError(
        "A program with this name already exists."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        department_id: Number(
          programForm.department_id
        ),
        program_name: name,
        program_code: code,
        duration_years: Number(
          programForm.duration_years
        ),
      };

      if (editingProgram) {
        await apiRequest(
          `/programs/${editingProgram.program_id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        showSuccess(
          `Program "${name}" updated successfully.`
        );
      } else {
        await apiRequest("/programs/", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        showSuccess(
          `Program "${name}" created successfully.`
        );
      }

      await loadAcademicData();
      closeModal();
    } catch (err) {
      showError(
        err.message ||
          "Could not save program."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteProgram = async (program) => {
    const relatedSemesters = semesters.filter(
      (semester) =>
        Number(semester.program_id) ===
        Number(program.program_id)
    );

    if (relatedSemesters.length > 0) {
      showError(
        "This program has semesters. Delete its semesters first."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete program "${program.program_name}"?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await apiRequest(
        `/programs/${program.program_id}`,
        {
          method: "DELETE",
        }
      );

      await loadAcademicData();

      showSuccess(
        `Program "${program.program_name}" deleted successfully.`
      );
    } catch (err) {
      showError(
        err.message ||
          "Could not delete program."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // SEMESTER CRUD
  // =========================================================

  const openAddSemester = (
    preselectedProgramId = ""
  ) => {
    setEditingSemester(null);

    setSemesterForm({
      program_id:
        preselectedProgramId
          ? String(preselectedProgramId)
          : "",
      semester_number: 1,
      semester_name: "Semester 1",
      is_active: true,
    });

    setModal("semester");
  };

  const openEditSemester = (semester) => {
    setEditingSemester(semester);

    setSemesterForm({
      program_id: String(
        semester.program_id
      ),
      semester_number:
        semester.semester_number,
      semester_name:
        semester.semester_name ||
        `Semester ${semester.semester_number}`,
      is_active:
        semester.is_active ?? true,
    });

    setModal("semester");
  };

  const handleSemesterNumberChange = (
    value
  ) => {
    const semesterNumber = Number(value);

    setSemesterForm((previous) => ({
      ...previous,
      semester_number: semesterNumber,
      semester_name: `Semester ${semesterNumber}`,
    }));
  };

  const saveSemester = async (event) => {
    event.preventDefault();

    if (!semesterForm.program_id) {
      showError(
        "Please select a program."
      );
      return;
    }

    const semesterNumber = Number(
      semesterForm.semester_number
    );

    if (
      semesterNumber < 1 ||
      semesterNumber > 8
    ) {
      showError(
        "Semester number must be between 1 and 8."
      );
      return;
    }

    const duplicate = semesters.find(
      (semester) =>
        Number(semester.program_id) ===
          Number(
            semesterForm.program_id
          ) &&
        Number(semester.semester_number) ===
          semesterNumber &&
        Number(semester.semester_id) !==
          Number(
            editingSemester?.semester_id
          )
    );

    if (duplicate) {
      showError(
        `Semester ${semesterNumber} already exists for this program.`
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        program_id: Number(
          semesterForm.program_id
        ),
        semester_number: semesterNumber,
        semester_name:
          semesterForm.semester_name.trim() ||
          `Semester ${semesterNumber}`,
        is_active: Boolean(
          semesterForm.is_active
        ),
      };

      if (editingSemester) {
        await apiRequest(
          `/semesters/${editingSemester.semester_id}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        showSuccess(
          `${payload.semester_name} updated successfully.`
        );
      } else {
        await apiRequest("/semesters/", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        showSuccess(
          `${payload.semester_name} created successfully.`
        );
      }

      await loadAcademicData();
      closeModal();
    } catch (err) {
      showError(
        err.message ||
          "Could not save semester."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteSemester = async (semester) => {
    const confirmed = window.confirm(
      `Delete ${semester.semester_name}?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await apiRequest(
        `/semesters/${semester.semester_id}`,
        {
          method: "DELETE",
        }
      );

      await loadAcademicData();

      showSuccess(
        `${semester.semester_name} deleted successfully.`
      );
    } catch (err) {
      showError(
        err.message ||
          "Could not delete semester."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // SETUP ALL SEMESTERS 1-8
  // =========================================================

  const setupAllSemesters = async (
    program
  ) => {
    const existingNumbers = semesters
      .filter(
        (semester) =>
          Number(semester.program_id) ===
          Number(program.program_id)
      )
      .map((semester) =>
        Number(semester.semester_number)
      );

    const missingSemesters = Array.from(
      { length: 8 },
      (_, index) => index + 1
    ).filter(
      (number) =>
        !existingNumbers.includes(number)
    );

    if (missingSemesters.length === 0) {
      showSuccess(
        `${program.program_name} already has Semester 1–8.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Create ${missingSemesters.length} missing semester(s) for "${program.program_name}"?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      for (const number of missingSemesters) {
        await apiRequest("/semesters/", {
          method: "POST",
          body: JSON.stringify({
            program_id:
              program.program_id,
            semester_number: number,
            semester_name: `Semester ${number}`,
            is_active: true,
          }),
        });
      }

      await loadAcademicData();

      showSuccess(
        `Semester 1–8 setup completed for "${program.program_name}".`
      );
    } catch (err) {
      showError(
        err.message ||
          "Could not setup semesters."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // SORTED DATA
  // =========================================================

  const sortedDepartments = useMemo(
    () =>
      [...departments].sort(
        (a, b) =>
          a.department_name.localeCompare(
            b.department_name
          )
      ),
    [departments]
  );

  const sortedPrograms = useMemo(
    () =>
      [...programs].sort(
        (a, b) =>
          a.program_name.localeCompare(
            b.program_name
          )
      ),
    [programs]
  );

  const sortedSemesters = useMemo(
    () =>
      [...semesters].sort((a, b) => {
        const programCompare =
          getProgramName(
            a.program_id
          ).localeCompare(
            getProgramName(
              b.program_id
            )
          );

        if (programCompare !== 0) {
          return programCompare;
        }

        return (
          Number(a.semester_number) -
          Number(b.semester_number)
        );
      }),
    [semesters, programs]
  );

  if (loading) {
    return (
      <div className="academic-setup-page">
        <div className="page-header">
          <div>
            <h1>Academic Setup</h1>
            <p>
              Loading departments, programs and
              semesters...
            </p>
          </div>
        </div>

        <div className="empty-state">
          Loading academic data...
        </div>
      </div>
    );
  }

  return (
    <div className="academic-setup-page">
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="page-header">
        <div>
          <h1>Academic Setup</h1>

          <p>
            Manage the academic hierarchy:
            Department → Program → Semester.
            Course sections are managed from
            Courses.
          </p>
        </div>

        <button
          className="button button-secondary"
          onClick={loadAcademicData}
          disabled={saving}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ================================================= */}
      {/* ALERTS */}
      {/* ================================================= */}

      {message && (
        <div className="academic-alert success">
          ✓ {message}
        </div>
      )}

      {error && (
        <div className="academic-alert error">
          ⚠ {error}
        </div>
      )}

      {/* ================================================= */}
      {/* STATS */}
      {/* ================================================= */}

      <div className="academic-stats">
        <div className="academic-stat-card">
          <span className="stat-icon">🏛</span>

          <div>
            <p>Departments</p>
            <h2>{departments.length}</h2>
          </div>
        </div>

        <div className="academic-stat-card">
          <span className="stat-icon">🎓</span>

          <div>
            <p>Programs</p>
            <h2>{programs.length}</h2>
          </div>
        </div>

        <div className="academic-stat-card">
          <span className="stat-icon">📖</span>

          <div>
            <p>Semesters</p>
            <h2>{semesters.length}</h2>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* ACTION CARDS */}
      {/* ================================================= */}

      <div className="academic-action-grid">
        <div className="academic-action-card">
          <div>
            <h3>1. Department</h3>

            <p>
              Create academic departments such
              as Computer Science.
            </p>
          </div>

          <button
            className="button button-primary"
            onClick={openAddDepartment}
          >
            + Add Department
          </button>
        </div>

        <div className="academic-action-card">
          <div>
            <h3>2. Program</h3>

            <p>
              Add BS Computer Science, AI, Data
              Science, IT or Cyber Security.
            </p>
          </div>

          <button
            className="button button-primary"
            onClick={openAddProgram}
          >
            + Add Program
          </button>
        </div>

        <div className="academic-action-card">
          <div>
            <h3>3. Semester</h3>

            <p>
              Create Semester 1 through Semester
              8 for every program.
            </p>
          </div>

          <button
            className="button button-primary"
            onClick={() => openAddSemester()}
          >
            + Add Semester
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* IMPORTANT INFO */}
      {/* ================================================= */}

      {/* ================================================= */}
      {/* DEPARTMENTS */}
      {/* ================================================= */}

      <section className="academic-table-card">
        <div className="table-card-header">
          <div>
            <h2>Departments</h2>
          </div>

          <button
            className="button button-primary"
            onClick={openAddDepartment}
          >
            + Add Department
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>DEPARTMENT</th>
                <th>CODE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {sortedDepartments.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="empty-table"
                  >
                    No departments created yet.
                  </td>
                </tr>
              ) : (
                sortedDepartments.map(
                  (department) => (
                    <tr
                      key={
                        department.department_id
                      }
                    >
                      <td>
                        {
                          department.department_id
                        }
                      </td>

                      <td>
                        {
                          department.department_name
                        }
                      </td>

                      <td>
                        <span className="code-badge">
                          {
                            department.department_code
                          }
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-edit"
                            onClick={() =>
                              openEditDepartment(
                                department
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="action-delete"
                            onClick={() =>
                              deleteDepartment(
                                department
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================= */}
      {/* PROGRAMS */}
      {/* ================================================= */}

      <section className="academic-table-card">
        <div className="table-card-header">
          <div>
            <h2>Programs</h2>
          </div>

          <button
            className="button button-primary"
            onClick={openAddProgram}
          >
            + Add Program
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>PROGRAM</th>
                <th>CODE</th>
                <th>DEPARTMENT</th>
                <th>DURATION</th>
                <th>SEMESTERS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {sortedPrograms.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="empty-table"
                  >
                    No programs created yet.
                  </td>
                </tr>
              ) : (
                sortedPrograms.map((program) => {
                  const semesterCount =
                    getProgramSemesterCount(
                      program.program_id
                    );

                  return (
                    <tr
                      key={program.program_id}
                    >
                      <td>
                        {program.program_name}
                      </td>

                      <td>
                        <span className="code-badge">
                          {program.program_code}
                        </span>
                      </td>

                      <td>
                        {getDepartmentName(
                          program.department_id
                        )}
                      </td>

                      <td>
                        {
                          program.duration_years
                        }{" "}
                        Years
                      </td>

                      <td>
                        <strong>
                          {semesterCount}/8
                        </strong>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-setup"
                            onClick={() =>
                              setupAllSemesters(
                                program
                              )
                            }
                            disabled={saving}
                          >
                            Setup 1–8
                          </button>

                          <button
                            className="action-edit"
                            onClick={() =>
                              openEditProgram(
                                program
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="action-delete"
                            onClick={() =>
                              deleteProgram(
                                program
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================= */}
      {/* SEMESTERS */}
      {/* ================================================= */}

      <section className="academic-table-card">
        <div className="table-card-header">
          <div>
            <h2>Semesters</h2>
          </div>

          <button
            className="button button-primary"
            onClick={() => openAddSemester()}
          >
            + Add Semester
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>PROGRAM</th>
                <th>SEMESTER</th>
                <th>NUMBER</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {sortedSemesters.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="empty-table"
                  >
                    No semesters created yet.
                  </td>
                </tr>
              ) : (
                sortedSemesters.map(
                  (semester) => (
                    <tr
                      key={
                        semester.semester_id
                      }
                    >
                      <td>
                        {getProgramName(
                          semester.program_id
                        )}
                      </td>

                      <td>
                        {
                          semester.semester_name
                        }
                      </td>

                      <td>
                        Semester{" "}
                        {
                          semester.semester_number
                        }
                      </td>

                      <td>
                        <span
                          className={
                            semester.is_active
                              ? "status-active"
                              : "status-inactive"
                          }
                        >
                          {semester.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-edit"
                            onClick={() =>
                              openEditSemester(
                                semester
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="action-delete"
                            onClick={() =>
                              deleteSemester(
                                semester
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================= */}
      {/* DEPARTMENT MODAL */}
      {/* ================================================= */}

      {modal === "department" && (
        <div className="modal-overlay">
          <div className="academic-modal">
            <div className="modal-header">
              <h2>
                {editingDepartment
                  ? "Edit Department"
                  : "Add Department"}
              </h2>

              <button
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={saveDepartment}
            >
              <div className="modal-body">
                <div className="form-group">
                  <label>
                    Department Name
                  </label>

                  <input
                    type="text"
                    placeholder="Computer Science"
                    value={
                      departmentForm.department_name
                    }
                    onChange={(event) =>
                      setDepartmentForm(
                        (previous) => ({
                          ...previous,
                          department_name:
                            event.target.value,
                        })
                      )
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Department Code
                  </label>

                  <input
                    type="text"
                    placeholder="CS"
                    maxLength="20"
                    value={
                      departmentForm.department_code
                    }
                    onChange={(event) =>
                      setDepartmentForm(
                        (previous) => ({
                          ...previous,
                          department_code:
                            event.target.value.toUpperCase(),
                        })
                      )
                    }
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="button button-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingDepartment
                    ? "Update Department"
                    : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* PROGRAM MODAL */}
      {/* ================================================= */}

      {modal === "program" && (
        <div className="modal-overlay">
          <div className="academic-modal">
            <div className="modal-header">
              <h2>
                {editingProgram
                  ? "Edit Program"
                  : "Add Program"}
              </h2>

              <button
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveProgram}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Department</label>

                  <select
                    value={
                      programForm.department_id
                    }
                    onChange={(event) =>
                      setProgramForm(
                        (previous) => ({
                          ...previous,
                          department_id:
                            event.target.value,
                        })
                      )
                    }
                    required
                  >
                    <option value="">
                      Select Department
                    </option>

                    {sortedDepartments.map(
                      (department) => (
                        <option
                          key={
                            department.department_id
                          }
                          value={
                            department.department_id
                          }
                        >
                          {
                            department.department_name
                          }{" "}
                          (
                          {
                            department.department_code
                          }
                          )
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Program Name</label>

                  <input
                    type="text"
                    placeholder="BS Computer Science"
                    value={
                      programForm.program_name
                    }
                    onChange={(event) =>
                      setProgramForm(
                        (previous) => ({
                          ...previous,
                          program_name:
                            event.target.value,
                        })
                      )
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Program Code</label>

                  <input
                    type="text"
                    placeholder="BSCS"
                    maxLength="20"
                    value={
                      programForm.program_code
                    }
                    onChange={(event) =>
                      setProgramForm(
                        (previous) => ({
                          ...previous,
                          program_code:
                            event.target.value.toUpperCase(),
                        })
                      )
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Duration (Years)
                  </label>

                  <select
                    value={
                      programForm.duration_years
                    }
                    onChange={(event) =>
                      setProgramForm(
                        (previous) => ({
                          ...previous,
                          duration_years:
                            Number(
                              event.target.value
                            ),
                        })
                      )
                    }
                  >
                    {[1, 2, 3, 4, 5, 6].map(
                      (year) => (
                        <option
                          key={year}
                          value={year}
                        >
                          {year}{" "}
                          {year === 1
                            ? "Year"
                            : "Years"}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="button button-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProgram
                    ? "Update Program"
                    : "Create Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* SEMESTER MODAL */}
      {/* ================================================= */}

      {modal === "semester" && (
        <div className="modal-overlay">
          <div className="academic-modal">
            <div className="modal-header">
              <h2>
                {editingSemester
                  ? "Edit Semester"
                  : "Add Semester"}
              </h2>

              <button
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={saveSemester}
            >
              <div className="modal-body">
                <div className="form-group">
                  <label>Program</label>

                  <select
                    value={
                      semesterForm.program_id
                    }
                    onChange={(event) =>
                      setSemesterForm(
                        (previous) => ({
                          ...previous,
                          program_id:
                            event.target.value,
                        })
                      )
                    }
                    required
                  >
                    <option value="">
                      Select Program
                    </option>

                    {sortedPrograms.map(
                      (program) => (
                        <option
                          key={
                            program.program_id
                          }
                          value={
                            program.program_id
                          }
                        >
                          {
                            program.program_name
                          }{" "}
                          (
                          {
                            program.program_code
                          }
                          )
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Semester Number
                  </label>

                  <select
                    value={
                      semesterForm.semester_number
                    }
                    onChange={(event) =>
                      handleSemesterNumberChange(
                        event.target.value
                      )
                    }
                  >
                    {[
                      1, 2, 3, 4,
                      5, 6, 7, 8,
                    ].map((number) => (
                      <option
                        key={number}
                        value={number}
                      >
                        Semester {number}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Semester Name</label>

                  <input
                    type="text"
                    value={
                      semesterForm.semester_name
                    }
                    onChange={(event) =>
                      setSemesterForm(
                        (previous) => ({
                          ...previous,
                          semester_name:
                            event.target.value,
                        })
                      )
                    }
                    required
                  />
                </div>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      semesterForm.is_active
                    }
                    onChange={(event) =>
                      setSemesterForm(
                        (previous) => ({
                          ...previous,
                          is_active:
                            event.target.checked,
                        })
                      )
                    }
                  />

                  <span>
                    Active Semester
                  </span>
                </label>

                <div className="semester-section-note">
                  <strong>
                    Sections are not created here.
                  </strong>

                  <p>
                    For{" "}
                    {ordinal(
                      semesterForm.semester_number
                    )} semester, sections such
                    as{" "}
                    {`${semesterForm.semester_number}M`}
                    / M and E groups are created
                    from the Courses page after a
                    course exists.
                  </p>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="button button-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingSemester
                    ? "Update Semester"
                    : "Create Semester"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}