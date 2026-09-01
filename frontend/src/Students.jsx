import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api/v1";

function getArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}
function getId(item) {
  return (
    item?.student_id ??
    item?.id ??
    item?.program_id ??
    item?.semester_id
  );
}

function getName(item, fallback) {
  return (
    item?.name ??
    item?.program_name ??
    item?.semester_name ??
    item?.title ??
    item?.code ??
    fallback
  );
}

function getStudentName(student) {
  return (
    `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
    "Unknown Student"
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-PK");
}

function formatApiError(data, fallback) {
  if (!data) return fallback;

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => item?.msg || JSON.stringify(item))
      .join("; ");
  }

  if (data.detail != null) {
    return JSON.stringify(data.detail);
  }

  return fallback;
}


  function parseDuplicateFaceError(errorMessage) {
  const text = String(errorMessage || "");

  const isDuplicate =
    /FACE[_\s]+ALREADY[_\s]+REGISTERED/i.test(text) ||
    /face is already registered/i.test(text) ||
    /already registered to another student/i.test(text);

  if (!isDuplicate) {
    return null;
  }

  let parsed = null;

  // The backend may return the detail object as JSON text.
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    parsed = null;
  }

  if (parsed?.code === "FACE_ALREADY_REGISTERED") {
    return {
      studentName:
        parsed.existing_student ||
        "Another registered student",

      registrationNo:
        parsed.existing_registration_no ||
        null,

      similarity:
        parsed.similarity != null
          ? `${parsed.similarity}%`
          : null,
    };
  }

  const studentMatch = text.match(
    /already registered(?:\s+to)?(?:\s+another\s+student)?[\s\S]*?student["']?\s*[:=]\s*["']([^"']+)["']/i
  );

  const registrationMatch = text.match(
    /registration[_\s]?no\.?["']?\s*[:=]\s*["']?([A-Za-z0-9_-]+)/i
  );

  const similarityMatch = text.match(
    /similarity["']?\s*[:=]\s*["']?([0-9]+(?:\.[0-9]+)?)%?/i
  );

  return {
    studentName:
      studentMatch?.[1]?.trim() ||
      "Another registered student",

    registrationNo:
      registrationMatch?.[1]?.trim() || null,

    similarity:
      similarityMatch?.[1]
        ? `${similarityMatch[1]}%`
        : null,
  };
}


async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body instanceof FormData
          ? {}
          : options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      `Network error — ${options.method || "GET"} ${path}. ` +
        "Please make sure FastAPI is running on 127.0.0.1:8000."
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  let data = null;

  try {
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text || null;
    }
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      formatApiError(
        data,
        `${options.method || "GET"} ${path} failed (${response.status})`
      )
    );
  }

  return data;
}

const emptyForm = {
  first_name: "",
  last_name: "",
  registration_no: "",
  email: "",
  phone: "",
  gender: "Male",
  date_of_birth: "",
  admission_year: new Date().getFullYear(),
  program_id: "",
  semester_id: "",
  current_status: "Active",
  is_active: true,
};

export default function Students() {
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);

  const [editingStudent, setEditingStudent] = useState(null);
  const [createdStudent, setCreatedStudent] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [creatingStudent, setCreatingStudent] = useState(false);
  const [updatingStudent, setUpdatingStudent] = useState(false);
  const [enrollingFace, setEnrollingFace] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState(null);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [duplicateFace, setDuplicateFace] = useState(null);

  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] =
    useState(false);
  const [showEnrollModal, setShowEnrollModal] =
    useState(false);
  const [enrollingStudentId, setEnrollingStudentId] =
    useState(null);
  const [enrollmentForm, setEnrollmentForm] = useState({
    student_id: "",
    course_id: "",
    section_id: "",
  });
  const [enrolling, setEnrolling] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Prevent double-click race conditions.
  const createLockRef = useRef(false);
  const enrollLockRef = useRef(false);

  // ============================================================
  // LOAD STUDENTS
  // ============================================================

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request("/students/");
      setStudents(getArray(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // LOAD PROGRAMS + SEMESTERS
  // ============================================================

  const loadOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);

      const [programData, semesterData] =
        await Promise.all([
          request("/programs/"),
          request("/semesters/"),
        ]);

      setPrograms(getArray(programData));
      setSemesters(getArray(semesterData));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
    loadOptions();
  }, [loadStudents, loadOptions]);

  // ============================================================
  // CAMERA CLEANUP
  // ============================================================

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraStarted(false);
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ============================================================
  // CAMERA — START AUTOMATICALLY WHEN STEP 2 OPENS
  // ============================================================

  const startCamera = useCallback(async () => {
    setError("");
    setMessage("Starting secure camera...");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is not supported by this browser."
        );
      }

      // Always clean an old stream first.
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        throw new Error(
          "Camera preview is not available yet. Please try again."
        );
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          reject(
            new Error(
              "Camera preview did not become ready. Please try again."
            )
          );
        }, 8000);

        const onReady = () => {
          window.clearTimeout(timeout);
          video.removeEventListener(
            "loadedmetadata",
            onReady
          );
          resolve();
        };

        video.addEventListener(
          "loadedmetadata",
          onReady,
          { once: true }
        );

        if (video.readyState >= 1) {
          onReady();
        }
      });

      await video.play();

      setCameraStarted(true);
      setCameraReady(true);
      setCapturedImage(null);
      setMessage(
        "Camera ready. Position ONE student's face inside the frame."
      );
    } catch (err) {
      console.error("Camera error:", err);

      // Do not leave a broken stream running.
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
        streamRef.current = null;
      }

      setCameraStarted(false);
      setCameraReady(false);

      if (err?.name === "NotAllowedError") {
        setError(
          "Camera permission was denied. Allow camera access for localhost:5173 in Chrome and try again."
        );
      } else if (err?.name === "NotReadableError") {
        setError(
          "The camera is already being used by another application. Close other camera apps and try again."
        );
      } else {
        setError(
          err?.message || "Unable to start the camera."
        );
      }

      setMessage("");
    }
  }, []);

  // Step 2 is rendered first; then the camera starts.
  useEffect(() => {
    if (
      showModal &&
      step === 2 &&
      createdStudent?.student_id &&
      !capturedImage &&
      !streamRef.current
    ) {
      startCamera();
    }
  }, [
    showModal,
    step,
    createdStudent,
    capturedImage,
    startCamera,
  ]);

  // ============================================================
  // FORM
  // ============================================================

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  }

  function validateForm() {
    if (!form.first_name.trim()) {
      return "First name is required.";
    }

    if (!form.last_name.trim()) {
      return "Last name is required.";
    }

    if (!form.registration_no.trim()) {
      return "Registration number is required.";
    }

    if (!form.email.trim()) {
      return "Email is required.";
    }

    if (!form.admission_year) {
      return "Admission year is required.";
    }

    if (!form.program_id) {
      return "Please select a program.";
    }

    if (!form.semester_id) {
      return "Please select a semester.";
    }

    return null;
  }

  // ============================================================
  // OPEN ADD STUDENT
  // ============================================================

  function openAddStudent() {
    stopCamera();

    createLockRef.current = false;
    enrollLockRef.current = false;

    setEditingStudent(null);
    setCreatedStudent(null);
    setStep(1);
    setCapturedImage(null);

    setForm({
      ...emptyForm,
      admission_year: new Date().getFullYear(),
    });

    setError("");
    setMessage("");
    setDuplicateFace(null);
    setShowModal(true);
  }

  // ============================================================
  // CLOSE MODAL
  // ============================================================

  function closeModal() {
    stopCamera();

    createLockRef.current = false;
    enrollLockRef.current = false;

    setShowModal(false);
    setStep(1);
    setEditingStudent(null);
    setCreatedStudent(null);
    setCapturedImage(null);
    setError("");
    setMessage("");
    setDuplicateFace(null);
  }

  // ============================================================
  // CREATE STUDENT — STEP 1
  // ============================================================

  async function continueToFaceRegistration() {
  if (creatingStudent) {
    return;
  }

  setError("");
  setMessage("");
  setDuplicateFace(null);

  const validationError = validateForm();

  if (validationError) {
    setError(validationError);
    return;
  }

  const registrationNo = form.registration_no
    .trim()
    .toLowerCase();

  const email = form.email
    .trim()
    .toLowerCase();

  // ----------------------------------------------------------
  // Check obvious duplicate student information locally.
  // This is ONLY a convenience check.
  //
  // The biometric duplicate check still happens on the backend.
  // ----------------------------------------------------------

  const duplicate = students.find((student) => {
    const existingRegistration = String(
      student.registration_no || ""
    )
      .trim()
      .toLowerCase();

    const existingEmail = String(
      student.email || ""
    )
      .trim()
      .toLowerCase();

    return (
      existingRegistration === registrationNo ||
      (
        email &&
        existingEmail === email
      )
    );
  });

  if (duplicate) {
    setError(
      `A student with this registration number or email already exists: ${getStudentName(
        duplicate
      )}.`
    );

    return;
  }

  // ----------------------------------------------------------
  // Create the student on the backend and capture the
  // returned record so Step 2 (Face Registration) has a
  // real student_id to enroll against.
  //
  // The backend may return the id as `student_id` or `id`,
  // so both are handled safely below.
  // ----------------------------------------------------------

  setCreatingStudent(true);

  try {
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      registration_no: form.registration_no.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      gender: form.gender,
      date_of_birth: form.date_of_birth || null,
      admission_year: Number(form.admission_year),
      program_id: form.program_id
        ? Number(form.program_id)
        : null,
      semester_id: form.semester_id
        ? Number(form.semester_id)
        : null,
      current_status: form.current_status,
      is_active: form.is_active,
    };

    const response = await request("/students/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Support both response shapes: a bare student object
    // or an envelope such as { data: {...} } / { student: {...} }.
    const created =
      response?.data ??
      response?.student ??
      response;

    const studentId =
      created?.student_id ??
      created?.id ??
      response?.student_id ??
      response?.id;

    if (
      studentId === undefined ||
      studentId === null
    ) {
      throw new Error(
        "The server did not return a student ID."
      );
    }

    setCreatedStudent({
      student_id: studentId,
      first_name:
        created?.first_name ||
        form.first_name.trim(),
      last_name:
        created?.last_name ||
        form.last_name.trim(),
      registration_no:
        created?.registration_no ||
        form.registration_no.trim(),
      email:
        created?.email || form.email.trim(),
    });

    setCapturedImage(null);
    setCameraReady(false);
    setStep(2);

    setMessage(
      "Student created. Please register the student's face to complete registration."
    );
  } catch (err) {
    setError(`Could not create student: ${err.message}`);
  } finally {
    setCreatingStudent(false);
  }
}

  // ============================================================
  // CAPTURE FACE
  // ============================================================

  async function captureFace() {
    setError("");
    setMessage("");

    if (!cameraReady) {
      setError(
        "Camera is still starting. Please wait until the preview is visible."
      );
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setError("Camera preview is not available.");
      return;
    }

    if (
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setError(
        "Camera image is not ready yet. Please wait a moment and try again."
      );
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      setError("Unable to capture the camera image.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Capture the actual camera frame.
    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const image = canvas.toDataURL(
      "image/jpeg",
      0.92
    );

    setCapturedImage(image);
    stopCamera();

    setMessage(
      "Face captured. Click “Validate & Register Face” to let InsightFace verify the image."
    );
  }

  // ============================================================
  // RETAKE
  // ============================================================

  function retakeFace() {
    setCapturedImage(null);
    setCameraReady(false);
    setError("");
    setMessage("Preparing camera again...");
  }

  // ============================================================
  // REGISTER / VALIDATE FACE
  // ============================================================

  // ============================================================
// REGISTER / VALIDATE FACE
// ============================================================

async function registerFace() {
  if (enrollLockRef.current || enrollingFace) {
    return;
  }

  if (!createdStudent?.student_id) {
    setError(
      "Student ID is missing. Please restart registration."
    );
    return;
  }

  if (!capturedImage) {
    setError(
      "Please capture the student's face first."
    );
    return;
  }

  enrollLockRef.current = true;

  try {
    setError("");
    setDuplicateFace(null);
    setMessage(
      "Validating face with InsightFace and securely creating the face embedding..."
    );
    setEnrollingFace(true);

    const blob = await fetch(
      capturedImage
    ).then((response) => response.blob());

    const formData = new FormData();

    formData.append(
      "image",
      blob,
      `${
        createdStudent.registration_no ||
        "student"
      }-face.jpg`
    );

    const data = await request(
      `/attendance/enroll/${createdStudent.student_id}`,
      {
        method: "POST",
        body: formData,
      }
    );

    setStep(3);

    setMessage(
      data?.message ||
        "Face enrolled successfully."
    );

    await loadStudents();
  } catch (err) {
    const duplicate = parseDuplicateFaceError(
      err?.message
    );

    if (duplicate) {
      setDuplicateFace(duplicate);
      setError("");
      setMessage("");
    } else {
      setDuplicateFace(null);

      setError(
        `Face registration failed: ${err.message}`
      );

      setMessage(
        "The face was not registered. No successful enrollment is being reported."
      );
    }
  } finally {
    setEnrollingFace(false);
    enrollLockRef.current = false;
  }
}

  // ============================================================
  // DELETE STUDENT
  // ============================================================

  async function deleteStudent(student) {
    const name = getStudentName(student);

    const confirmed = window.confirm(
      `Delete ${name}?\n\nStudent ID: ${student.student_id}\nRegistration No.: ${student.registration_no}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingStudentId(student.student_id);
      setError("");

      await request(
        `/students/${student.student_id}`,
        {
          method: "DELETE",
        }
      );

      setMessage(
        `${name} was deleted successfully.`
      );

      await loadStudents();
      await loadEnrollments();
    } catch (err) {
      setError(
        `Could not delete ${name}: ${err.message}`
      );
    } finally {
      setDeletingStudentId(null);
    }
  }

  // ============================================================
  // EDIT STUDENT
  // ============================================================

  function openEditStudent(student) {
    setEditingStudent(student);

    setForm({
      first_name: student.first_name || "",
      last_name: student.last_name || "",
      registration_no: student.registration_no || "",
      email: student.email || "",
      phone: student.phone || "",
      gender: student.gender || "Male",
      date_of_birth: student.date_of_birth
        ? String(student.date_of_birth).slice(0, 10)
        : "",
      admission_year: student.admission_year || new Date().getFullYear(),
      program_id: String(student.program_id || ""),
      semester_id: String(student.semester_id || ""),
      current_status: student.current_status || "Active",
      is_active: student.is_active ?? true,
    });

    setShowModal(true);
    setStep(1);
  }

  async function updateStudent() {
    if (updatingStudent) return;

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setUpdatingStudent(true);

    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        registration_no: form.registration_no.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        admission_year: Number(form.admission_year),
        program_id: form.program_id
          ? Number(form.program_id)
          : null,
        semester_id: form.semester_id
          ? Number(form.semester_id)
          : null,
        current_status: form.current_status,
        is_active: form.is_active,
      };

      await request(
        `/students/${editingStudent.student_id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      setMessage(
        "Student updated successfully."
      );

      setShowModal(false);
      setEditingStudent(null);

      await loadStudents();
    } catch (err) {
      setError(
        err.message ||
          "Could not update student."
      );
    } finally {
      setUpdatingStudent(false);
    }
  }

  // ============================================================
  // ENROLLMENT
  // ============================================================

  const loadEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);

    try {
      const [enrollmentData, courseData, sectionData] =
        await Promise.all([
          request("/enrollments/"),
          request("/courses/"),
          request("/sections/"),
        ]);

      setEnrollments(getArray(enrollmentData));
      setCourses(getArray(courseData));
      setSections(getArray(sectionData));
    } catch (err) {
      console.error(
        "Enrollment load failed:",
        err
      );
    } finally {
      setLoadingEnrollments(false);
    }
  }, []);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  const getStudentEnrollments = (
    studentId
  ) => {
    return enrollments.filter(
      (enrollment) =>
        Number(enrollment.student_id) ===
        Number(studentId)
    );
  };

  const getEnrollmentDisplay = (studentId) => {
    const studentEnrollments =
      getStudentEnrollments(studentId);

    if (studentEnrollments.length === 0) {
      return "Not enrolled";
    }

    return studentEnrollments
      .map((enrollment) => {
        const section = sections.find(
          (s) =>
            Number(s.section_id) ===
            Number(enrollment.section_id)
        );

        const course = section
          ? courses.find(
              (c) =>
                Number(c.course_id) ===
                Number(section.course_id)
            )
          : null;

        const sectionName =
          section?.section_name ||
          `Section #${enrollment.section_id}`;

        const courseCode =
          course?.course_code ||
          "Unknown Course";

        return `${courseCode} → ${sectionName}`;
      })
      .join("; ");
  };

  const openEnrollModal = (student) => {
    setEnrollingStudentId(student.student_id);

    setEnrollmentForm({
      student_id: String(student.student_id),
      course_id: "",
      section_id: "",
    });

    setShowEnrollModal(true);
  };

  const saveEnrollment = async (event) => {
    event.preventDefault();

    if (!enrollmentForm.course_id) {
      setError("Please select a course.");
      return;
    }

    if (!enrollmentForm.section_id) {
      setError("Please select a section.");
      return;
    }

    setEnrolling(true);

    try {
      const payload = {
        student_id: Number(
          enrollmentForm.student_id
        ),
        section_id: Number(
          enrollmentForm.section_id
        ),
        enrollment_date: new Date()
          .toISOString()
          .slice(0, 10),
        status: "ACTIVE",
      };

      await request("/enrollments/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const student = students.find(
        (s) =>
          s.student_id ===
          Number(enrollmentForm.student_id)
      );

      setMessage(
        `${getStudentName(student)} enrolled successfully.`
      );

      setShowEnrollModal(false);
      setEnrollingStudentId(null);

      await loadEnrollments();
    } catch (err) {
      setError(
        err.message ||
          "Could not enroll student."
      );
    } finally {
      setEnrolling(false);
    }
  };

  const availableSectionsForEnrollment =
    sections.filter(
      (section) =>
        String(section.course_id) ===
        String(enrollmentForm.course_id)
    );

  const filteredStudents = students.filter(
    (student) => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) return true;

      return [
        student.first_name,
        student.last_name,
        student.registration_no,
        student.email,
        student.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    }
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <style>{`
       @keyframes duplicateFaceAlertIn {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes duplicateFacePulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.78;
  }
}
      `}</style>

      <div
      style={{
        padding: "32px",
        minHeight: "100%",
        background: "#f5f7fb",
      }}
    >
      {/* PAGE HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "25px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "34px",
              color: "#172033",
            }}
          >
            Students
          </h1>

          <p
            style={{
              marginTop: "7px",
              color: "#64748b",
            }}
          >
            Student registration and face enrollment
          </p>
        </div>

        <button
          onClick={openAddStudent}
          style={primaryButtonStyle}
        >
          + Add Student
        </button>
      </div>

      {/* GLOBAL MESSAGE */}

      {message && !showModal && (
        <div style={successMessageStyle}>
          ✓ {message}
        </div>
      )}

      {error && !showModal && (
        <div style={errorMessageStyle}>
          ⚠️ {error}
        </div>
      )}

      {/* STUDENT LIST */}

      <div
        style={{
          background: "white",
          borderRadius: "16px",
          boxShadow:
            "0 8px 30px rgba(15,23,42,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "22px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            borderBottom: "1px solid #eef2f7",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: "#172033",
              }}
            >
              Registered Students
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              {filteredStudents.length} student
              {filteredStudents.length === 1
                ? ""
                : "s"}{" "}
              registered
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search students..."
              style={searchStyle}
            />

            <button
              onClick={loadStudents}
              style={secondaryButtonStyle}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={emptyStyle}>
            Loading students from FastAPI...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={emptyStyle}>
            No students found.
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "850px",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Student",
                    "Registration No.",
                    "Email",
                    "Gender",
                    "Admission Year",
                    "Status",
                    "Enrolled In",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={headerStyle}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map(
                  (student) => (
                    <tr
                      key={student.student_id}
                    >
                      <td style={cellStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "50%",
                              background:
                                "#eff6ff",
                              color: "#2563eb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent:
                                "center",
                              fontWeight: 800,
                            }}
                          >
                            {(
                              student.first_name?.[0] ||
                              "S"
                            ) +
                              (
                                student.last_name?.[0] ||
                                ""
                              )}
                          </div>

                          <div>
                            <strong>
                              {getStudentName(
                                student
                              )}
                            </strong>

                            <div
                              style={{
                                fontSize: "11px",
                                color: "#94a3b8",
                                marginTop: "2px",
                              }}
                            >
                              ID:{" "}
                              {student.student_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={cellStyle}>
                        {student.registration_no ||
                          "—"}
                      </td>

                      <td style={cellStyle}>
                        {student.email || "—"}
                      </td>

                      <td style={cellStyle}>
                        {student.gender || "—"}
                      </td>

                      <td style={cellStyle}>
                        {student.admission_year ||
                          "—"}
                      </td>

                      <td style={cellStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            padding:
                              "6px 10px",
                            borderRadius:
                              "999px",
                            background:
                              student.is_active
                                ? "#ecfdf5"
                                : "#fef2f2",
                            color:
                              student.is_active
                                ? "#15803d"
                                : "#dc2626",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {student.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td style={cellStyle}>
                        {getEnrollmentDisplay(
                          student.student_id
                        )}
                      </td>

                      <td style={cellStyle}>
                        <div
                          style={{
                            display: "flex",
                            gap: "7px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            onClick={() =>
                              openEnrollModal(
                                student
                              )
                            }
                            style={{
                              ...smallButtonStyle,
                              background:
                                "#f0fdf4",
                              color:
                                "#16a34a",
                            }}
                          >
                            Enroll
                          </button>

                          <button
                            onClick={() =>
                              openEditStudent(
                                student
                              )
                            }
                            style={{
                              ...smallButtonStyle,
                              background:
                                "#eff6ff",
                              color:
                                "#2563eb",
                            }}
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              deleteStudent(
                                student
                              )
                            }
                            disabled={
                              deletingStudentId ===
                              student.student_id
                            }
                            style={{
                              ...smallButtonStyle,
                              background:
                                "#fff1f2",
                              color:
                                "#dc2626",
                            }}
                          >
                            {deletingStudentId ===
                            student.student_id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          REGISTRATION MODAL
      ======================================================== */}

      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            {/* HEADER */}

            <div
              style={{
                padding: "22px 26px",
                borderBottom:
                  "1px solid #e2e8f0",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#172033",
                  }}
                >
                  {editingStudent
                    ? "Edit Student"
                    : "Add New Student"}
                </h2>

                <p
                  style={{
                    margin:
                      "6px 0 0",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  {editingStudent
                    ? "Update student information"
                    : "Student details → face verification → registration"}
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={
                  creatingStudent ||
                  updatingStudent ||
                  enrollingFace
                }
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            {/* STEPPER */}

            <div
              style={{
                display: "flex",
                gap: "8px",
                padding: "18px 26px",
                background: "#f8fafc",
              }}
            >
              {[
                ["1", "Student Details"],
                ["2", "Face Registration"],
                ["3", "Complete"],
              ].map(([number, label]) => (
                <div
                  key={number}
                  style={{
                    flex: 1,
                    padding: "9px 10px",
                    borderRadius: "8px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    background:
                      String(step) === number
                        ? "#2563eb"
                        : "#e2e8f0",
                    color:
                      String(step) === number
                        ? "white"
                        : "#64748b",
                  }}
                >
                  {number}. {label}
                </div>
              ))}
            </div>

            <div
              style={{
                padding: "26px",
                maxHeight: "calc(90vh - 160px)",
                overflowY: "auto",
              }}
            >
              {duplicateFace && step === 2 ? (
                <div style={duplicateFaceAlertStyle}>
                  <div style={duplicateFaceHeaderStyle}>
                    <div style={duplicateFaceIconStyle}>
                      🔒
                    </div>

                    <div>
                      <div style={duplicateFaceTitleStyle}>
                        Face Registration Blocked
                      </div>

                      <div style={duplicateFaceSubtitleStyle}>
                        Biometric identity conflict detected
                      </div>
                    </div>
                  </div>

                  <div style={duplicateFaceBodyStyle}>
                    <p style={{ margin: 0 }}>
                      This face is already registered in the
                      Smart Attendance System and cannot be
                      enrolled under another student.
                    </p>

                    <div style={duplicateFaceDetailsStyle}>
  <div
    style={{
      padding: "12px 14px",
      background: "#ffffff",
    }}
  >
    <span style={duplicateFaceLabelStyle}>
      Existing Student
    </span>

    <strong style={duplicateFaceValueStyle}>
      {duplicateFace.studentName}
    </strong>
  </div>

  {duplicateFace.registrationNo && (
    <div
      style={{
        padding: "12px 14px",
        background: "#ffffff",
      }}
    >
      <span style={duplicateFaceLabelStyle}>
        Registration No.
      </span>

      <strong style={duplicateFaceValueStyle}>
        {duplicateFace.registrationNo}
      </strong>
    </div>
  )}

  {duplicateFace.similarity && (
    <div
      style={{
        padding: "12px 14px",
        background: "#ffffff",
      }}
    >
      <span style={duplicateFaceLabelStyle}>
        Face Similarity
      </span>

      <strong
        style={{
          ...duplicateFaceValueStyle,
          color: "#be123c",
        }}
      >
        {duplicateFace.similarity}
      </strong>
    </div>
  )}
</div>

                    <div style={duplicateFaceSecurityStyle}>
                      <span style={duplicateFaceCheckStyle}>
                        ✓
                      </span>

                      <span>
                        Enrollment rejected. No biometric
                        data was saved for this student.
                      </span>
                    </div>
                  </div>

                  <div style={duplicateFaceFooterStyle}>
                    <button
                      onClick={() => {
                        setDuplicateFace(null);
                        setError("");
                        setMessage(
                          "Please position the correct student's face inside the frame."
                        );
                        setCapturedImage(null);
                        setCameraReady(false);
                      }}
                      disabled={enrollingFace}
                      style={duplicateFaceActionStyle}
                    >
                      ↻ Try Another Face
                    </button>
                  </div>
                </div>
              ) : error ? (
                <div
                  style={{
                    ...errorMessageStyle,
                    marginBottom: "18px",
                  }}
                >
                  ⚠️ {error}
                </div>
              ) : null}

              {message && !duplicateFace && (
                <div
                  style={{
                    ...successMessageStyle,
                    marginBottom: "18px",
                  }}
                >
                  ✓ {message}
                </div>
              )}

              {/* =================================================
                  STEP 1 — DETAILS
              ================================================= */}

              {step === 1 && (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap: "17px",
                    }}
                  >
                    <Input
                      label="First Name"
                      name="first_name"
                      value={form.first_name}
                      onChange={handleChange}
                      placeholder="Enter first name"
                    />

                    <Input
                      label="Last Name"
                      name="last_name"
                      value={form.last_name}
                      onChange={handleChange}
                      placeholder="Enter last name"
                    />

                    <Input
                      label="Registration No."
                      name="registration_no"
                      value={form.registration_no}
                      onChange={handleChange}
                      placeholder="e.g. F24BCS001"
                    />

                    <Input
                      label="Email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="student@example.com"
                    />

                    <Input
                      label="Phone"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+92..."
                    />

                    <Select
                      label="Gender"
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      options={[
                        {
                          value: "Male",
                          label: "Male",
                        },
                        {
                          value: "Female",
                          label: "Female",
                        },
                        {
                          value: "Other",
                          label: "Other",
                        },
                      ]}
                    />

                    <Input
                      label="Date of Birth"
                      name="date_of_birth"
                      type="date"
                      value={form.date_of_birth}
                      onChange={handleChange}
                    />

                    <Input
                      label="Admission Year"
                      name="admission_year"
                      type="number"
                      value={form.admission_year}
                      onChange={handleChange}
                    />

                    <div>
                      <label style={labelStyle}>
                        Program
                      </label>

                      <select
                        name="program_id"
                        value={form.program_id}
                        onChange={handleChange}
                        disabled={
                          loadingOptions
                        }
                        style={inputStyle}
                      >
                        <option value="">
                          {loadingOptions
                            ? "Loading programs..."
                            : "Select Program"}
                        </option>

                        {programs.map(
                          (program) => {
                            const id =
                              getId(program);

                            return (
                              <option
                                key={id}
                                value={id}
                              >
                                {getName(
                                  program,
                                  `Program ${id}`
                                )}
                              </option>
                            );
                          }
                        )}
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>
                        Semester
                      </label>

                      <select
                        name="semester_id"
                        value={
                          form.semester_id
                        }
                        onChange={
                          handleChange
                        }
                        disabled={
                          loadingOptions
                        }
                        style={inputStyle}
                      >
                        <option value="">
                          {loadingOptions
                            ? "Loading semesters..."
                            : "Select Semester"}
                        </option>

                        {semesters.map(
                          (semester) => {
                            const id =
                              getId(semester);

                            return (
                              <option
                                key={id}
                                value={id}
                              >
                                {getName(
                                  semester,
                                  `Semester ${id}`
                                )}
                              </option>
                            );
                          }
                        )}
                      </select>
                    </div>

                    <Select
                      label="Current Status"
                      name="current_status"
                      value={
                        form.current_status
                      }
                      onChange={handleChange}
                      options={[
                        {
                          value: "Active",
                          label: "Active",
                        },
                        {
                          value: "Inactive",
                          label: "Inactive",
                        },
                        {
                          value: "Suspended",
                          label: "Suspended",
                        },
                      ]}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "flex-end",
                      gap: "10px",
                      marginTop: "28px",
                    }}
                  >
                    <button
                      onClick={closeModal}
                      style={
                        secondaryButtonStyle
                      }
                    >
                      Cancel
                    </button>

                    {editingStudent ? (
                      <button
                        onClick={
                          updateStudent
                        }
                        disabled={
                          updatingStudent
                        }
                        style={
                          primaryButtonStyle
                        }
                      >
                        {updatingStudent
                          ? "Updating..."
                          : "Save Changes"}
                      </button>
                    ) : (
                      <button
                        onClick={
                          continueToFaceRegistration
                        }
                        disabled={
                          creatingStudent
                        }
                        style={
                          primaryButtonStyle
                        }
                      >
                        {creatingStudent
                          ? "Creating Student..."
                          : "Next: Register Face →"}
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* =================================================
                  STEP 2 — FACE
              ================================================= */}

              {step === 2 && (
                <>
                  {createdStudent && (
                    <div
                      style={{
                        padding:
                          "14px 16px",
                        background:
                          "#f8fafc",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: "10px",
                        marginBottom:
                          "20px",
                      }}
                    >
                      <strong
                        style={{
                          color:
                            "#172033",
                        }}
                      >
                        {getStudentName(
                          createdStudent
                        )}
                      </strong>

                      <div
                        style={{
                          marginTop:
                            "4px",
                          color:
                            "#64748b",
                          fontSize:
                            "13px",
                        }}
                      >
                        Registration No.:{" "}
                        {
                          createdStudent.registration_no
                        }{" "}
                        · Student ID:{" "}
                        {
                          createdStudent.student_id
                        }
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      position:
                        "relative",
                      width: "100%",
                      maxWidth:
                        "760px",
                      margin:
                        "0 auto",
                      aspectRatio:
                        "16 / 9",
                      background:
                        "#0f172a",
                      borderRadius:
                        "16px",
                      overflow:
                        "hidden",
                      border:
                        "1px solid #1e293b",
                    }}
                  >
                    {/* Keep video mounted so the
                        camera stream is never attached
                        to a non-existent element. */}

                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit:
                          "cover",
                        display:
                          capturedImage
                            ? "none"
                            : "block",
                        transform:
                          "scaleX(-1)",
                      }}
                    />

                    {capturedImage && (
                      <img
                        src={capturedImage}
                        alt="Captured student face"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit:
                            "cover",
                        }}
                      />
                    )}

                    {!cameraStarted &&
                      !capturedImage && (
                        <div
                          style={{
                            position:
                              "absolute",
                            inset: 0,
                            display:
                              "flex",
                            flexDirection:
                              "column",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            color:
                              "white",
                            textAlign:
                              "center",
                            padding:
                              "30px",
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "44px",
                              marginBottom:
                                "10px",
                            }}
                          >
                            📷
                          </div>

                          <h3
                            style={{
                              margin:
                                "0 0 8px",
                            }}
                          >
                            Starting Camera
                          </h3>

                          <p
                            style={{
                              margin: 0,
                              color:
                                "#cbd5e1",
                            }}
                          >
                            Please wait...
                          </p>
                        </div>
                      )}

                    {!cameraStarted &&
                      capturedImage && (
                        <div
                          style={{
                            position:
                              "absolute",
                            top: "16px",
                            left: "50%",
                            transform:
                              "translateX(-50%)",
                            background:
                              "rgba(15,23,42,0.85)",
                            color:
                              "white",
                            padding:
                              "8px 14px",
                            borderRadius:
                              "999px",
                            fontSize:
                              "12px",
                            fontWeight: 700,
                          }}
                        >
                          Captured image
                        </div>
                      )}

                    {cameraStarted && (
                      <>
                        <div
                          style={{
                            position:
                              "absolute",
                            inset:
                              "14% 25%",
                            border:
                              "3px solid rgba(255,255,255,0.9)",
                            borderRadius:
                              "18px",
                            pointerEvents:
                              "none",
                          }}
                        />

                        <div
                          style={{
                            position:
                              "absolute",
                            top: "16px",
                            left: "50%",
                            transform:
                              "translateX(-50%)",
                            padding:
                              "8px 15px",
                            background:
                              "rgba(37,99,235,0.95)",
                            color:
                              "white",
                            borderRadius:
                              "999px",
                            fontSize:
                              "13px",
                            fontWeight: 700,
                          }}
                        >
                          Position ONE face here
                        </div>
                      </>
                    )}
                  </div>

                  <canvas
                    ref={canvasRef}
                    style={{
                      display: "none",
                    }}
                  />

                  <div
                    style={{
                      textAlign:
                        "center",
                      marginTop:
                        "14px",
                      color:
                        "#64748b",
                      fontSize:
                        "13px",
                    }}
                  >
                    InsightFace will reject the image if
                    no face is detected or if multiple
                    faces are visible.
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "center",
                      flexWrap:
                        "wrap",
                      gap: "12px",
                      marginTop:
                        "22px",
                    }}
                  >
                    {cameraStarted &&
                      !capturedImage && (
                        <>
                          <button
                            onClick={
                              captureFace
                            }
                            disabled={
                              !cameraReady
                            }
                            style={
                              primaryButtonStyle
                            }
                          >
                            📸 Capture Face
                          </button>

                          <button
                            onClick={
                              stopCamera
                            }
                            style={
                              secondaryButtonStyle
                            }
                          >
                            Stop Camera
                          </button>
                        </>
                      )}

                    {!cameraStarted &&
                      !capturedImage && (
                        <button
                          onClick={
                            startCamera
                          }
                          style={
                            primaryButtonStyle
                          }
                        >
                          📷 Start Camera
                        </button>
                      )}

                    {capturedImage && (
                      <>
                        <button
                          onClick={
                            retakeFace
                          }
                          disabled={
                            enrollingFace
                          }
                          style={
                            secondaryButtonStyle
                          }
                        >
                          ↻ Retake
                        </button>

                        <button
                          onClick={
                            registerFace
                          }
                          disabled={
                            enrollingFace
                          }
                          style={
                            primaryButtonStyle
                          }
                        >
                          {enrollingFace
                            ? "Validating & Registering..."
                            : "✓ Validate & Register Face"}
                        </button>
                      </>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "12px",
                      marginTop:
                        "25px",
                    }}
                  >
                    <button
                      onClick={() => {
                        stopCamera();
                        setCapturedImage(
                          null
                        );
                        setStep(1);
                        setError("");
                        setMessage("");
                      }}
                      disabled={
                        enrollingFace
                      }
                      style={{
                        ...secondaryButtonStyle,
                        background:
                          "transparent",
                      }}
                    >
                      ← Back to Details
                    </button>

                    <span
                      style={{
                        color:
                          "#64748b",
                        fontSize:
                          "13px",
                        alignSelf:
                          "center",
                      }}
                    >
                      One clear face is required.
                    </span>
                  </div>
                </>
              )}

              {/* =================================================
                  STEP 3 — COMPLETE
              ================================================= */}

              {step === 3 && (
                <div
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "25px 10px 10px",
                  }}
                >
                  <div
                    style={{
                      width:
                        "76px",
                      height:
                        "76px",
                      borderRadius:
                        "50%",
                      background:
                        "#dcfce7",
                      color:
                        "#15803d",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      fontSize:
                        "38px",
                      margin:
                        "0 auto 18px",
                    }}
                  >
                    ✓
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      color:
                        "#15803d",
                      fontSize:
                        "28px",
                    }}
                  >
                    Student Registered Successfully
                  </h2>

                  <p
                    style={{
                      color:
                        "#64748b",
                      marginTop:
                        "10px",
                      lineHeight:
                        1.6,
                    }}
                  >
                    Student information and face
                    embedding have been successfully
                    stored. The student is now ready
                    for face recognition and attendance.
                  </p>

                  {createdStudent && (
                    <div
                      style={{
                        margin:
                          "25px auto",
                        maxWidth:
                          "520px",
                        background:
                          "#f8fafc",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius:
                          "12px",
                        padding:
                          "20px",
                        textAlign:
                          "left",
                      }}
                    >
                      <InfoRow
                        label="Student"
                        value={getStudentName(
                          createdStudent
                        )}
                      />

                      <InfoRow
                        label="Student ID"
                        value={
                          createdStudent.student_id
                        }
                      />

                      <InfoRow
                        label="Registration No."
                        value={
                          createdStudent.registration_no
                        }
                      />

                      <InfoRow
                        label="Face Status"
                        value="✓ Verified & Enrolled"
                      />

                      <InfoRow
                        label="Recognition"
                        value="Ready"
                      />

                      <InfoRow
                        label="Attendance"
                        value="Ready"
                      />
                    </div>
                  )}

                  <button
                    onClick={closeModal}
                    style={
                      primaryButtonStyle
                    }
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          ENROLLMENT MODAL
      ================================================= */}

      {showEnrollModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div
              style={{
                padding: "22px 26px",
                borderBottom:
                  "1px solid #e2e8f0",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#172033",
                  }}
                >
                  Enroll Student
                </h2>

                <p
                  style={{
                    margin:
                      "6px 0 0",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  Assign the student to a
                  course section.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setEnrollingStudentId(null);
                }}
                disabled={enrolling}
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveEnrollment}>
              <div
                style={{
                  padding: "26px",
                }}
              >
                <div
                  style={{
                    padding:
                      "12px 14px",
                    background: "#f8fafc",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      "10px",
                    marginBottom:
                      "20px",
                    fontSize: "13px",
                    color: "#475569",
                  }}
                >
                  <strong>
                    Student:{" "}
                    {getStudentName(
                      students.find(
                        (s) =>
                          s.student_id ===
                          Number(
                            enrollmentForm.student_id
                          )
                      )
                    ) || `#${enrollmentForm.student_id}`}
                  </strong>
                </div>

                <div style={formGroupStyle}>
                  <label style={labelStyle}>
                    Course
                  </label>

                  <select
                    value={
                      enrollmentForm.course_id
                    }
                    onChange={(event) =>
                      setEnrollmentForm(
                        (previous) => ({
                          ...previous,
                          course_id:
                            event.target
                              .value,
                          section_id: "",
                        })
                      )
                    }
                    disabled={enrolling}
                    style={inputStyle}
                  >
                    <option value="">
                      Select Course
                    </option>

                    {courses.map((course) => (
                      <option
                        key={
                          course.course_id
                        }
                        value={
                          course.course_id
                        }
                      >
                        {course.course_code}{" "}
                        —{" "}
                        {course.course_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={formGroupStyle}>
                  <label style={labelStyle}>
                    Section
                  </label>

                  <select
                    value={
                      enrollmentForm.section_id
                    }
                    onChange={(event) =>
                      setEnrollmentForm(
                        (previous) => ({
                          ...previous,
                          section_id:
                            event.target
                              .value,
                        })
                      )
                    }
                    disabled={
                      !enrollmentForm.course_id ||
                      enrolling
                    }
                    style={inputStyle}
                  >
                    <option value="">
                      {!enrollmentForm.course_id
                        ? "Select course first"
                        : availableSectionsForEnrollment
                            .length === 0
                        ? "No sections for this course"
                        : "Select Section"}
                    </option>

                    {availableSectionsForEnrollment.map(
                      (section) => (
                        <option
                          key={
                            section.section_id
                          }
                          value={
                            section.section_id
                          }
                        >
                          {section.section_name}
                          {section.room_number
                            ? ` — Room ${section.room_number}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div
                style={{
                  padding:
                    "18px 26px",
                  borderTop:
                    "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setEnrollingStudentId(null);
                  }}
                  disabled={enrolling}
                  style={
                    secondaryButtonStyle
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    enrolling ||
                    !enrollmentForm.course_id ||
                    !enrollmentForm.section_id
                  }
                  style={{
                    ...primaryButtonStyle,
                    opacity:
                      enrolling ||
                      !enrollmentForm.course_id ||
                      !enrollmentForm.section_id
                        ? 0.6
                        : 1,
                  }}
                >
                  {enrolling
                    ? "Enrolling..."
                    : "Enroll Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
       )}
      </div>
    </>
  );
}

// ============================================================
// REUSABLE INPUT
// ============================================================

function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      <input
        name={name}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

// ============================================================
// REUSABLE SELECT
// ============================================================

function Select({
  label,
  name,
  value,
  onChange,
  options,
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        style={inputStyle}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================
// INFO ROW
// ============================================================

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        gap: "20px",
        padding: "9px 0",
        borderBottom:
          "1px solid #e2e8f0",
      }}
    >
      <span
        style={{
          color: "#64748b",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: "#172033",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================

const primaryButtonStyle = {
  border: "none",
  background: "#2563eb",
  color: "white",
  padding: "11px 18px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "14px",
};

const secondaryButtonStyle = {
  border: "1px solid #dbe3ef",
  background: "white",
  color: "#334155",
  padding: "11px 17px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};

const smallButtonStyle = {
  border: "none",
  padding: "7px 11px",
  borderRadius: "7px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
};

const searchStyle = {
  width: "220px",
  padding: "10px 12px",
  border: "1px solid #dbe3ef",
  borderRadius: "9px",
  outline: "none",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "44px",
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: "9px",
  outline: "none",
  fontSize: "14px",
  color: "#172033",
  background: "white",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 700,
};

const formGroupStyle = {
  marginBottom: "18px",
};

const headerStyle = {
  padding: "14px 12px",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  textAlign: "left",
};

const cellStyle = {
  padding: "16px 12px",
  color: "#475569",
  fontSize: "14px",
  whiteSpace: "nowrap",
  borderTop: "1px solid #eef2f7",
};

const emptyStyle = {
  padding: "55px 20px",
  textAlign: "center",
  color: "#64748b",
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(15,23,42,0.62)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const modalStyle = {
  width: "100%",
  maxWidth: "900px",
  maxHeight: "92vh",
  background: "white",
  borderRadius: "18px",
  overflow: "hidden",
  boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
};

const duplicateFaceAlertStyle = {
  marginBottom: "20px",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  background: "#ffffff",
  overflow: "hidden",
  boxShadow:
    "0 10px 28px rgba(15, 23, 42, 0.08)",
  animation:
    "duplicateFaceAlertIn 0.32s ease-out",
};

const duplicateFaceHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "13px",
  padding: "17px 20px",
  borderBottom:
    "1px solid #edf1f5",
};

const duplicateFaceIconStyle = {
  width: "38px",
  height: "38px",
  flexShrink: 0,
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#fff1f2",
  color: "#be123c",
  fontSize: "17px",
};

const duplicateFaceTitleStyle = {
  color: "#172033",
  fontSize: "15px",
  fontWeight: 800,
  letterSpacing: "-0.01em",
};

const duplicateFaceSubtitleStyle = {
  marginTop: "3px",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.02em",
};

const duplicateFaceBodyStyle = {
  padding: "17px 20px 15px",
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.55,
};

const duplicateFaceDetailsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "1px",
  marginTop: "15px",
  border: "1px solid #edf1f5",
  borderRadius: "10px",
  overflow: "hidden",
  background: "#edf1f5",
};

const duplicateFaceLabelStyle = {
  display: "block",
  marginBottom: "4px",
  color: "#94a3b8",
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const duplicateFaceValueStyle = {
  display: "block",
  color: "#172033",
  fontSize: "13px",
  fontWeight: 750,
};

const duplicateFaceSecurityStyle = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  marginTop: "14px",
  padding: "10px 12px",
  borderRadius: "8px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 600,
};

const duplicateFaceCheckStyle = {
  width: "19px",
  height: "19px",
  flexShrink: 0,
  borderRadius: "50%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#ecfdf5",
  color: "#15803d",
  fontSize: "11px",
  fontWeight: 800,
};

const duplicateFaceFooterStyle = {
  display: "flex",
  justifyContent: "flex-end",
  padding: "12px 20px 17px",
};

const duplicateFaceActionStyle = {
  border: "1px solid #fecaca",
  background: "#ffffff",
  color: "#b91c1c",
  padding: "10px 15px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: "13px",
  boxShadow: "0 3px 10px rgba(220,38,38,0.08)",
};

const errorMessageStyle = {
  padding: "13px 15px",
  background: "#fff1f2",
  border: "1px solid #fecdd3",
  color: "#be123c",
  borderRadius: "10px",
  fontSize: "13px",
};

const successMessageStyle = {
  padding: "13px 15px",
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  color: "#15803d",
  borderRadius: "10px",
  fontSize: "13px",
};

const closeButtonStyle = {
  width: "38px",
  height: "38px",
  border: "none",
  borderRadius: "9px",
  background: "#f1f5f9",
  color: "#475569",
  fontSize: "21px",
  cursor: "pointer",
};