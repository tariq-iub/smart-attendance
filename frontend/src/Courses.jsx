import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  api,
  normalizeList,
} from "./api";

/* =========================================================
   HELPERS
========================================================= */

const getCourseId = (item) =>
  item?.course_id ?? item?.id;

const getProgramId = (item) =>
  item?.program_id ?? item?.id;

const getSemesterId = (item) =>
  item?.semester_id ?? item?.id;

const getTeacherId = (item) =>
  item?.teacher_id ?? item?.id;

const getSectionId = (item) =>
  item?.section_id ?? item?.id;

const getProgramName = (item) =>
  item?.program_name ||
  item?.name ||
  `Program #${getProgramId(item)}`;

const getSemesterName = (item) =>
  item?.semester_name ||
  `Semester ${item?.semester_number || ""}`;

const getTeacherName = (teacher) => {
  if (!teacher) {
    return "Unknown Teacher";
  }

  const fullName = `${teacher.first_name || ""} ${
    teacher.last_name || ""
  }`.trim();

  return (
    fullName ||
    teacher.teacher_name ||
    teacher.name ||
    teacher.email ||
    `Teacher #${getTeacherId(
      teacher
    )}`
  );
};

/* =========================================================
   SEMESTER → SECTION LOGIC
========================================================= */

function ordinal(number) {
  const n = Number(number);

  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";

  return `${n}th`;
}

function generateSectionNames(
  semesterNumber
) {
  const prefix =
    ordinal(semesterNumber);

  const morning = Array.from(
    { length: 8 },
    (_, index) =>
      `${prefix} ${index + 1}M`
  );

  const evening = Array.from(
    { length: 3 },
    (_, index) =>
      `${prefix} ${index + 1}E`
  );

  return [
    ...morning,
    ...evening,
  ];
}

/* =========================================================
   EMPTY FORMS
========================================================= */

const emptyCourseForm = {
  program_id: "",
  semester_id: "",
  course_code: "",
  course_name: "",
  credit_hours: 3,
  is_lab: false,
};

const emptySectionForm = {
  course_id: "",
  teacher_id: "",
  section_name: "",
  room_number: "",
  max_students: 50,
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Courses() {
  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const [courses, setCourses] =
    useState([]);

  const [programs, setPrograms] =
    useState([]);

  const [semesters, setSemesters] =
    useState([]);

  const [teachers, setTeachers] =
    useState([]);

  const [sections, setSections] =
    useState([]);

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    showCourseModal,
    setShowCourseModal,
  ] = useState(false);

  const [
    showSectionModal,
    setShowSectionModal,
  ] = useState(false);

  const [
    editingCourse,
    setEditingCourse,
  ] = useState(null);

  const [
    selectedCourse,
    setSelectedCourse,
  ] = useState(null);

  const [
    courseForm,
    setCourseForm,
  ] = useState(emptyCourseForm);

  const [
    sectionForm,
    setSectionForm,
  ] = useState(emptySectionForm);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadAllData = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        coursesResponse,
        programsResponse,
        semestersResponse,
        teachersResponse,
        sectionsResponse,
      ] = await Promise.all([
        api.get("/courses/"),
        api.get("/programs/"),
        api.get("/semesters/"),
        api.get("/teachers/"),
        api.get("/sections/"),
      ]);

      setCourses(
        normalizeList(coursesResponse)
      );

      setPrograms(
        normalizeList(programsResponse)
      );

      setSemesters(
        normalizeList(semestersResponse)
      );

      setTeachers(
        normalizeList(teachersResponse)
      );

      setSections(
        normalizeList(sectionsResponse)
      );
    } catch (err) {
      console.error(
        "Courses load error:",
        err
      );

      setError(
        err.message ||
          "Could not load academic data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  /* =======================================================
     MAPS
  ======================================================= */

  const programMap = useMemo(() => {
    const map = new Map();

    programs.forEach((program) => {
      map.set(
        String(getProgramId(program)),
        program
      );
    });

    return map;
  }, [programs]);

  const semesterMap = useMemo(() => {
    const map = new Map();

    semesters.forEach((semester) => {
      map.set(
        String(getSemesterId(semester)),
        semester
      );
    });

    return map;
  }, [semesters]);

  const teacherMap = useMemo(() => {
    const map = new Map();

    teachers.forEach((teacher) => {
      map.set(
        String(getTeacherId(teacher)),
        teacher
      );
    });

    return map;
  }, [teachers]);

  /* =======================================================
     FILTERED SEMESTERS
  ======================================================= */

  const availableSemesters =
    useMemo(() => {
      if (!courseForm.program_id) {
        return [];
      }

      return semesters
        .filter(
          (semester) =>
            String(
              semester.program_id
            ) ===
            String(
              courseForm.program_id
            )
        )
        .sort(
          (a, b) =>
            Number(
              a.semester_number
            ) -
            Number(
              b.semester_number
            )
        );
    }, [
      semesters,
      courseForm.program_id,
    ]);

  /* =======================================================
     SELECTED COURSE SEMESTER
  ======================================================= */

  const selectedCourseSemester =
    useMemo(() => {
      if (!selectedCourse) {
        return null;
      }

      return semesterMap.get(
        String(
          selectedCourse.semester_id
        )
      );
    }, [
      selectedCourse,
      semesterMap,
    ]);

  /* =======================================================
     AVAILABLE SECTIONS
  ======================================================= */

  const availableSectionNames =
    useMemo(() => {
      if (
        !selectedCourseSemester
          ?.semester_number
      ) {
        return [];
      }

      const allNames =
        generateSectionNames(
          selectedCourseSemester
            .semester_number
        );

      const existingNames =
        sections
          .filter(
            (section) =>
              String(
                section.course_id
              ) ===
              String(
                getCourseId(
                  selectedCourse
                )
              )
          )
          .map((section) =>
            String(
              section.section_name
            ).trim().toLowerCase()
          );

      return allNames.filter(
        (name) =>
          !existingNames.includes(
            name.toLowerCase()
          )
      );
    }, [
      selectedCourseSemester,
      selectedCourse,
      sections,
    ]);

  /* =======================================================
     FILTER COURSES
  ======================================================= */

  const filteredCourses =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return courses;
      }

      return courses.filter(
        (course) => {
          const program =
            programMap.get(
              String(
                course.program_id
              )
            );

          const semester =
            semesterMap.get(
              String(
                course.semester_id
              )
            );

          const courseSections =
            sections
              .filter(
                (section) =>
                  String(
                    section.course_id
                  ) ===
                  String(
                    getCourseId(course)
                  )
              )
              .map(
                (section) =>
                  section.section_name
              )
              .join(" ");

          const text = [
            course.course_name,
            course.course_code,
            getProgramName(program),
            getSemesterName(semester),
            courseSections,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return text.includes(query);
        }
      );
    }, [
      courses,
      sections,
      search,
      programMap,
      semesterMap,
    ]);

  /* =======================================================
     COURSE MODAL
  ======================================================= */

  const openAddCourse = () => {
    setEditingCourse(null);

    setCourseForm({
      ...emptyCourseForm,
    });

    setError("");
    setSuccess("");

    setShowCourseModal(true);
  };

  const openEditCourse = (
    course
  ) => {
    setEditingCourse(course);

    setCourseForm({
      program_id: String(
        course.program_id ?? ""
      ),
      semester_id: String(
        course.semester_id ?? ""
      ),
      course_code:
        course.course_code || "",
      course_name:
        course.course_name || "",
      credit_hours:
        course.credit_hours ?? 3,
      is_lab:
        Boolean(course.is_lab),
    });

    setError("");
    setSuccess("");

    setShowCourseModal(true);
  };

  const closeCourseModal = () => {
    if (saving) return;

    setShowCourseModal(false);

    setEditingCourse(null);

    setCourseForm(
      emptyCourseForm
    );
  };

  /* =======================================================
     COURSE CHANGE
  ======================================================= */

  const handleCourseChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setCourseForm(
      (previous) => {
        const next = {
          ...previous,
          [name]:
            type === "checkbox"
              ? checked
              : value,
        };

        /*
          Program change = reset semester.
        */

        if (
          name === "program_id"
        ) {
          next.semester_id = "";
        }

        return next;
      }
    );
  };

  /* =======================================================
     CREATE / UPDATE COURSE
  ======================================================= */

  const handleCourseSubmit =
    async (event) => {
      event.preventDefault();

      setSaving(true);
      setError("");
      setSuccess("");

      try {
        if (
          !courseForm.program_id
        ) {
          throw new Error(
            "Please select a program."
          );
        }

        if (
          !courseForm.semester_id
        ) {
          throw new Error(
            "Please select a semester."
          );
        }

        const code =
          courseForm.course_code.trim();

        const name =
          courseForm.course_name.trim();

        if (!code) {
          throw new Error(
            "Course code is required."
          );
        }

        if (!name) {
          throw new Error(
            "Course name is required."
          );
        }

        const duplicate =
          courses.find(
            (course) =>
              String(
                course.program_id
              ) ===
                String(
                  courseForm.program_id
                ) &&
              String(
                course.semester_id
              ) ===
                String(
                  courseForm.semester_id
                ) &&
              String(
                course.course_code ||
                  ""
              )
                .trim()
                .toLowerCase() ===
                code.toLowerCase() &&
              (
                !editingCourse ||
                String(
                  getCourseId(course)
                ) !==
                  String(
                    getCourseId(
                      editingCourse
                    )
                  )
              )
          );

        if (duplicate) {
          throw new Error(
            `Duplicate blocked: ${duplicate.course_code} already exists in the selected program and semester.`
          );
        }

        const payload = {
          program_id: Number(
            courseForm.program_id
          ),
          semester_id: Number(
            courseForm.semester_id
          ),
          course_code: code,
          course_name: name,
          credit_hours: Number(
            courseForm.credit_hours
          ),
          is_lab:
            Boolean(
              courseForm.is_lab
            ),
        };

        if (editingCourse) {
          await api.put(
            `/courses/${getCourseId(
              editingCourse
            )}`,
            payload
          );

          setSuccess(
            "Course updated successfully."
          );

          setShowCourseModal(false);
        } else {
          const createdCourse =
            await api.post(
              "/courses/",
              payload
            );

          setSuccess(
            "Course created successfully. Now assign a section."
          );

          setShowCourseModal(false);

          setSelectedCourse(
            createdCourse
          );

          setSectionForm({
            ...emptySectionForm,
            course_id: String(
              getCourseId(
                createdCourse
              )
            ),
          });

          setShowSectionModal(true);
        }

        await loadAllData();

        setEditingCourse(null);

        setCourseForm(
          emptyCourseForm
        );
      } catch (err) {
        console.error(
          "Course save error:",
          err
        );

        setError(
          err.message ||
            "Could not save course."
        );
      } finally {
        setSaving(false);
      }
    };

  /* =======================================================
     DELETE COURSE
  ======================================================= */

  const handleDeleteCourse =
    async (course) => {
      const id =
        getCourseId(course);

      const courseSections =
        sections.filter(
          (section) =>
            String(
              section.course_id
            ) === String(id)
        );

      const confirmed =
        window.confirm(
          courseSections.length > 0
            ? `"${course.course_name}" has ${courseSections.length} section(s). Delete may be blocked by the backend.\n\nContinue?`
            : `Delete "${course.course_name}"?`
        );

      if (!confirmed) return;

      try {
        setError("");
        setSuccess("");

        await api.delete(
          `/courses/${id}`
        );

        setSuccess(
          "Course deleted successfully."
        );

        await loadAllData();
      } catch (err) {
        setError(
          err.message ||
            "Could not delete course."
        );
      }
    };

  /* =======================================================
     SECTION MODAL
  ======================================================= */

  const openAddSection = (
    course
  ) => {
    setSelectedCourse(course);

    const semester =
      semesterMap.get(
        String(
          course.semester_id
        )
      );

    const semesterNumber =
      semester?.semester_number;

    const names =
      generateSectionNames(
        semesterNumber
      );

    const existingNames =
      sections
        .filter(
          (section) =>
            String(
              section.course_id
            ) ===
            String(
              getCourseId(course)
            )
        )
        .map((section) =>
          String(
            section.section_name
          )
            .trim()
            .toLowerCase()
        );

    const firstAvailable =
      names.find(
        (name) =>
          !existingNames.includes(
            name.toLowerCase()
          )
      ) || "";

    setSectionForm({
      ...emptySectionForm,
      course_id: String(
        getCourseId(course)
      ),
      section_name:
        firstAvailable,
    });

    setError("");
    setSuccess("");

    setShowSectionModal(true);
  };

  const closeSectionModal = () => {
    if (saving) return;

    setShowSectionModal(false);

    setSelectedCourse(null);

    setSectionForm(
      emptySectionForm
    );
  };

  /* =======================================================
     SECTION CHANGE
  ======================================================= */

  const handleSectionChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setSectionForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  /* =======================================================
     CREATE SECTION
  ======================================================= */

  const handleSectionSubmit =
    async (event) => {
      event.preventDefault();

      setSaving(true);
      setError("");
      setSuccess("");

      try {
        if (
          !selectedCourse
        ) {
          throw new Error(
            "No course selected."
          );
        }

        if (
          !sectionForm.section_name
        ) {
          throw new Error(
            "Please select a section."
          );
        }

        if (
          !sectionForm.teacher_id
        ) {
          throw new Error(
            "Please select a teacher."
          );
        }

        if (
          Number(
            sectionForm.max_students
          ) < 1
        ) {
          throw new Error(
            "Maximum students must be at least 1."
          );
        }

        /*
          FINAL DUPLICATE PROTECTION
        */

        const duplicate =
          sections.find(
            (section) =>
              String(
                section.course_id
              ) ===
                String(
                  getCourseId(
                    selectedCourse
                  )
                ) &&
              String(
                section.section_name
              )
                .trim()
                .toLowerCase() ===
                String(
                  sectionForm.section_name
                )
                  .trim()
                  .toLowerCase()
          );

        if (duplicate) {
          throw new Error(
            `Duplicate blocked: ${sectionForm.section_name} already exists for this course.`
          );
        }

        const payload = {
          course_id: Number(
            getCourseId(
              selectedCourse
            )
          ),
          teacher_id: Number(
            sectionForm.teacher_id
          ),
          section_name:
            sectionForm.section_name,
          room_number:
            sectionForm.room_number.trim() ||
            null,
          max_students: Number(
            sectionForm.max_students
          ),
        };

        await api.post(
          "/sections/",
          payload
        );

        setSuccess(
          `${sectionForm.section_name} created successfully.`
        );

        await loadAllData();

        setShowSectionModal(false);

        setSelectedCourse(null);

        setSectionForm(
          emptySectionForm
        );
      } catch (err) {
        console.error(
          "Section save error:",
          err
        );

        setError(
          err.message ||
            "Could not create section."
        );
      } finally {
        setSaving(false);
      }
    };

  /* =======================================================
     DELETE SECTION
  ======================================================= */

  const handleDeleteSection =
    async (section) => {
      const confirmed =
        window.confirm(
          `Delete ${section.section_name}?`
        );

      if (!confirmed) return;

      try {
        setError("");
        setSuccess("");

        await api.delete(
          `/sections/${getSectionId(
            section
          )}`
        );

        setSuccess(
          "Section deleted successfully."
        );

        await loadAllData();
      } catch (err) {
        setError(
          err.message ||
            "Could not delete section."
        );
      }
    };

  /* =======================================================
     COURSE SECTIONS
  ======================================================= */

  const getCourseSections = (
    course
  ) =>
    sections.filter(
      (section) =>
        String(
          section.course_id
        ) ===
        String(
          getCourseId(course)
        )
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="courses-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .courses-page {
          min-height: 100%;
          padding: 30px;
          background: #f8fafc;
          color: #172033;
        }

        .courses-container {
          max-width: 1450px;
          margin: 0 auto;
        }

        .courses-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .courses-header h1 {
          margin: 0;
          font-size: 32px;
        }

        .courses-header p {
          margin: 8px 0 0;
          color: #64748b;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .button {
          border: none;
          border-radius: 10px;
          padding: 11px 16px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .button-primary {
          background: #2563eb;
          color: white;
        }

        .button-secondary {
          background: white;
          border: 1px solid #dbe3ef;
          color: #334155;
        }

        .button-danger {
          background: #fff1f2;
          color: #dc2626;
        }

        .button-small {
          padding: 7px 10px;
          font-size: 12px;
        }

        .alert {
          padding: 14px 18px;
          border-radius: 12px;
          margin-bottom: 18px;
        }

        .alert-error {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
        }

        .alert-success {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .directory-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow:
            0 8px 25px
            rgba(15,23,42,.04);
        }

        .directory-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 20px 24px;
          border-bottom:
            1px solid #e2e8f0;
        }

        .directory-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .directory-header p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .count-badge {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #2563eb;
          font-weight: 800;
        }

        .search-container {
          padding: 18px 24px;
          border-bottom:
            1px solid #e2e8f0;
        }

        .search-input {
          width: 100%;
          max-width: 520px;
          min-height: 45px;
          padding: 10px 13px;
          border: 1px solid #dbe3ef;
          border-radius: 10px;
          outline: none;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 1150px;
          border-collapse: collapse;
        }

        th {
          padding: 14px 17px;
          background: #f8fafc;
          color: #64748b;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
        }

        td {
          padding: 15px 17px;
          border-top:
            1px solid #eef2f7;
          vertical-align: top;
          color: #475569;
          font-size: 14px;
        }

        .course-name {
          font-weight: 800;
          color: #172033;
        }

        .course-code {
          display: inline-block;
          padding: 5px 8px;
          background: #f1f5f9;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 700;
        }

        .badge {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .lab {
          background: #fff7ed;
          color: #c2410c;
        }

        .lecture {
          background: #ecfdf5;
          color: #047857;
        }

        .section-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 260px;
        }

        .section-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 9px;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: #f8fafc;
        }

        .section-name {
          font-weight: 800;
          color: #334155;
          font-size: 12px;
        }

        .section-detail {
          margin-top: 3px;
          color: #64748b;
          font-size: 11px;
        }

        .empty-state {
          padding: 70px 25px;
          text-align: center;
          color: #64748b;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          z-index: 9999;
        }

        .modal {
          width: 100%;
          max-width: 720px;
          max-height: 92vh;
          overflow-y: auto;
          background: white;
          border-radius: 18px;
          box-shadow:
            0 25px 60px
            rgba(15,23,42,.3);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 26px;
          border-bottom:
            1px solid #e2e8f0;
        }

        .modal-header h2 {
          margin: 0;
        }

        .modal-close {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 10px;
          background: #f1f5f9;
          font-size: 22px;
          cursor: pointer;
        }

        .modal-body {
          padding: 25px 26px;
        }

        .form-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 17px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .form-group.full {
          grid-column: 1 / -1;
        }

        .form-label {
          font-size: 13px;
          font-weight: 700;
          color: #475569;
        }

        .form-input,
        .form-select {
          width: 100%;
          min-height: 46px;
          padding: 11px 13px;
          border: 1px solid #dbe3ef;
          border-radius: 10px;
          background: white;
          font-size: 14px;
          outline: none;
        }

        .form-input:focus,
        .form-select:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px
            rgba(37,99,235,.1);
        }

        .checkbox-box {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 46px;
          padding: 10px 13px;
          border: 1px solid #dbe3ef;
          border-radius: 10px;
          background: #f8fafc;
        }

        .selected-course {
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 12px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }

        .selected-course strong {
          color: #1e40af;
        }

        .section-info {
          padding: 13px;
          border-radius: 10px;
          background: #f8fafc;
          color: #475569;
          font-size: 13px;
          margin-bottom: 18px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 18px 26px;
          border-top:
            1px solid #e2e8f0;
        }

        @media (max-width: 850px) {
          .courses-page {
            padding: 18px;
          }

          .courses-header {
            flex-direction: column;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group.full {
            grid-column: auto;
          }
        }
      `}</style>

      <div className="courses-container">

        {/* ===============================================
            HEADER
        ================================================ */}

        <div className="courses-header">
          <div>
            <h1>
              Courses
            </h1>

            <p>
              Create courses and assign
              semester-based Morning and
              Evening sections.
            </p>
          </div>

          <div className="header-actions">
            <button
              className="button button-secondary"
              onClick={loadAllData}
              disabled={loading || saving}
            >
              🔄 Refresh
            </button>

            <button
              className="button button-primary"
              onClick={openAddCourse}
              disabled={saving}
            >
              + Add Course
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            ✓ {success}
          </div>
        )}

        <div className="directory-card">

          <div className="directory-header">
            <div>
              <h2>
                Course Directory
              </h2>

              <p>
                {loading
                  ? "Loading academic data..."
                  : `${filteredCourses.length} course(s) loaded from FastAPI`}
              </p>
            </div>

            <div className="count-badge">
              {filteredCourses.length}
            </div>
          </div>

          <div className="search-container">
            <input
              className="search-input"
              placeholder="Search course, code, semester or section..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />
          </div>

          {loading ? (
            <div className="empty-state">
              Loading courses...
            </div>
          ) : filteredCourses.length ===
            0 ? (
            <div className="empty-state">
              <h3>
                No courses found
              </h3>

              <p>
                Create your first course
                using + Add Course.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Code</th>
                    <th>Program</th>
                    <th>Semester</th>
                    <th>Credits</th>
                    <th>Type</th>
                    <th>Sections</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCourses.map(
                    (course) => {
                      const id =
                        getCourseId(
                          course
                        );

                      const program =
                        programMap.get(
                          String(
                            course.program_id
                          )
                        );

                      const semester =
                        semesterMap.get(
                          String(
                            course.semester_id
                          )
                        );

                      const courseSections =
                        getCourseSections(
                          course
                        );

                      return (
                        <tr key={id}>

                          <td>
                            <div className="course-name">
                              {
                                course.course_name
                              }
                            </div>
                          </td>

                          <td>
                            <span className="course-code">
                              {
                                course.course_code
                              }
                            </span>
                          </td>

                          <td>
                            {
                              getProgramName(
                                program
                              )
                            }
                          </td>

                          <td>
                            {
                              getSemesterName(
                                semester
                              )
                            }
                          </td>

                          <td>
                            {
                              course.credit_hours
                            }{" "}
                            CH
                          </td>

                          <td>
                            <span
                              className={`badge ${
                                course.is_lab
                                  ? "lab"
                                  : "lecture"
                              }`}
                            >
                              {course.is_lab
                                ? "Laboratory"
                                : "Lecture"}
                            </span>
                          </td>

                          <td>
                            <div className="section-list">

                              {courseSections.map(
                                (
                                  section
                                ) => {
                                  const teacher =
                                    teacherMap.get(
                                      String(
                                        section.teacher_id
                                      )
                                    );

                                  return (
                                    <div
                                      className="section-item"
                                      key={
                                        getSectionId(
                                          section
                                        )
                                      }
                                    >
                                      <div>
                                        <div className="section-name">
                                          {
                                            section.section_name
                                          }
                                        </div>

                                        <div className="section-detail">
                                          {
                                            getTeacherName(
                                              teacher
                                            )
                                          }
                                          {" · "}
                                          Room:{" "}
                                          {
                                            section.room_number ||
                                            "—"
                                          }
                                        </div>
                                      </div>

                                      <button
                                        className="button button-danger button-small"
                                        onClick={() =>
                                          handleDeleteSection(
                                            section
                                          )
                                        }
                                      >
                                        ×
                                      </button>
                                    </div>
                                  );
                                }
                              )}

                              <button
                                className="button button-secondary button-small"
                                onClick={() =>
                                  openAddSection(
                                    course
                                  )
                                }
                              >
                                + Add Section
                              </button>

                            </div>
                          </td>

                          <td>
                            <div
                              style={{
                                display:
                                  "flex",
                                gap: "7px",
                              }}
                            >
                              <button
                                className="button button-secondary button-small"
                                onClick={() =>
                                  openEditCourse(
                                    course
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="button button-danger button-small"
                                onClick={() =>
                                  handleDeleteCourse(
                                    course
                                  )
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ===============================================
          COURSE MODAL
      ================================================ */}

      {showCourseModal && (
        <div className="modal-overlay">
          <div className="modal">

            <div className="modal-header">
              <h2>
                {editingCourse
                  ? "Edit Course"
                  : "Add Course"}
              </h2>

              <button
                className="modal-close"
                onClick={closeCourseModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleCourseSubmit
              }
            >
              <div className="modal-body">

                <div className="form-grid">

                  {/* PROGRAM */}

                  <div className="form-group">
                    <label className="form-label">
                      Program
                    </label>

                    <select
                      className="form-select"
                      name="program_id"
                      value={
                        courseForm.program_id
                      }
                      onChange={
                        handleCourseChange
                      }
                      required
                    >
                      <option value="">
                        Select Program
                      </option>

                      {programs.map(
                        (program) => (
                          <option
                            key={
                              getProgramId(
                                program
                              )
                            }
                            value={
                              getProgramId(
                                program
                              )
                            }
                          >
                            {
                              getProgramName(
                                program
                              )
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* SEMESTER */}

                  <div className="form-group">
                    <label className="form-label">
                      Semester
                    </label>

                    <select
                      className="form-select"
                      name="semester_id"
                      value={
                        courseForm.semester_id
                      }
                      onChange={
                        handleCourseChange
                      }
                      disabled={
                        !courseForm.program_id
                      }
                      required
                    >
                      <option value="">
                        {courseForm.program_id
                          ? "Select Semester"
                          : "Select Program First"}
                      </option>

                      {availableSemesters.map(
                        (semester) => (
                          <option
                            key={
                              getSemesterId(
                                semester
                              )
                            }
                            value={
                              getSemesterId(
                                semester
                              )
                            }
                          >
                            {
                              getSemesterName(
                                semester
                              )
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* CODE */}

                  <div className="form-group">
                    <label className="form-label">
                      Course Code
                    </label>

                    <input
                      className="form-input"
                      name="course_code"
                      value={
                        courseForm.course_code
                      }
                      onChange={
                        handleCourseChange
                      }
                      placeholder="CS101"
                      required
                    />
                  </div>

                  {/* NAME */}

                  <div className="form-group">
                    <label className="form-label">
                      Course Name
                    </label>

                    <input
                      className="form-input"
                      name="course_name"
                      value={
                        courseForm.course_name
                      }
                      onChange={
                        handleCourseChange
                      }
                      placeholder="Programming Fundamentals"
                      required
                    />
                  </div>

                  {/* CREDIT HOURS */}

                  <div className="form-group">
                    <label className="form-label">
                      Credit Hours
                    </label>

                    <input
                      className="form-input"
                      name="credit_hours"
                      type="number"
                      min="1"
                      value={
                        courseForm.credit_hours
                      }
                      onChange={
                        handleCourseChange
                      }
                      required
                    />
                  </div>

                  {/* LAB */}

                  <div className="form-group">
                    <label className="form-label">
                      Course Type
                    </label>

                    <label className="checkbox-box">
                      <input
                        name="is_lab"
                        type="checkbox"
                        checked={
                          courseForm.is_lab
                        }
                        onChange={
                          handleCourseChange
                        }
                      />

                      Laboratory Course
                    </label>
                  </div>

                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={closeCourseModal}
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
                    : editingCourse
                    ? "Save Changes"
                    : "Create Course"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ===============================================
          SECTION MODAL
      ================================================ */}

      {showSectionModal &&
        selectedCourse && (
          <div className="modal-overlay">
            <div className="modal">

              <div className="modal-header">
                <h2>
                  Add Section
                </h2>

                <button
                  className="modal-close"
                  onClick={
                    closeSectionModal
                  }
                  disabled={saving}
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={
                  handleSectionSubmit
                }
              >
                <div className="modal-body">

                  <div className="selected-course">
                    <strong>
                      {
                        selectedCourse.course_code
                      }{" "}
                      —{" "}
                      {
                        selectedCourse.course_name
                      }
                    </strong>

                    <div
                      style={{
                        marginTop:
                          "5px",
                        color:
                          "#64748b",
                        fontSize:
                          "13px",
                      }}
                    >
                      {
                        getSemesterName(
                          selectedCourseSemester
                        )
                      }
                    </div>
                  </div>

                  <div className="section-info">
                    <strong>
                      Available sections:
                    </strong>
                    <br />

                    {selectedCourseSemester
                      ?.semester_number
                      ? `${ordinal(
                          selectedCourseSemester.semester_number
                        )} 1M–8M and ${ordinal(
                          selectedCourseSemester.semester_number
                        )} 1E–3E`
                      : "Semester information not found."}
                  </div>

                  <div className="form-grid">

                    {/* SECTION */}

                    <div className="form-group full">
                      <label className="form-label">
                        Section
                      </label>

                      <select
                        className="form-select"
                        name="section_name"
                        value={
                          sectionForm.section_name
                        }
                        onChange={
                          handleSectionChange
                        }
                        required
                      >
                        <option value="">
                          Select Section
                        </option>

                        {availableSectionNames.map(
                          (name) => (
                            <option
                              key={name}
                              value={name}
                            >
                              {name}
                            </option>
                          )
                        )}
                      </select>

                      {availableSectionNames.length ===
                        0 && (
                        <div
                          style={{
                            color:
                              "#dc2626",
                            fontSize:
                              "12px",
                          }}
                        >
                          All 11 allowed sections
                          for this course have
                          already been created.
                        </div>
                      )}
                    </div>

                    {/* TEACHER */}

                    <div className="form-group">
                      <label className="form-label">
                        Teacher
                      </label>

                      <select
                        className="form-select"
                        name="teacher_id"
                        value={
                          sectionForm.teacher_id
                        }
                        onChange={
                          handleSectionChange
                        }
                        required
                      >
                        <option value="">
                          Select Teacher
                        </option>

                        {teachers.map(
                          (teacher) => (
                            <option
                              key={
                                getTeacherId(
                                  teacher
                                )
                              }
                              value={
                                getTeacherId(
                                  teacher
                                )
                              }
                            >
                              {
                                getTeacherName(
                                  teacher
                                )
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* ROOM */}

                    <div className="form-group">
                      <label className="form-label">
                        Room Number
                      </label>

                      <input
                        className="form-input"
                        name="room_number"
                        value={
                          sectionForm.room_number
                        }
                        onChange={
                          handleSectionChange
                        }
                        placeholder="1.54"
                      />
                    </div>

                    {/* MAX STUDENTS */}

                    <div className="form-group">
                      <label className="form-label">
                        Maximum Students
                      </label>

                      <input
                        className="form-input"
                        name="max_students"
                        type="number"
                        min="1"
                        value={
                          sectionForm.max_students
                        }
                        onChange={
                          handleSectionChange
                        }
                        required
                      />
                    </div>

                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={
                      closeSectionModal
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={
                      saving ||
                      availableSectionNames.length ===
                        0
                    }
                  >
                    {saving
                      ? "Creating..."
                      : "Create Section"}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}
    </div>
  );
}