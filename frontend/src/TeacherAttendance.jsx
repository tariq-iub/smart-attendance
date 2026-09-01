import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiRequest,
  normalizeList,
  activeSessionStorageKey,
} from "./api";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
   "http://127.0.0.1:8000/api/v1";

const RECOGNITION_URL = `${API_BASE}/attendance/recognize`;

function TeacherAttendance() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanLockRef = useRef(false);

  /*
   * Demo teacher.
   *
   * Your verified database currently contains:
   * teacher_id 16 = Ubaidur Rehman
   *
   * Authentication will replace this with the logged-in
   * teacher identity later.
   */
  const DEMO_TEACHER_ID = 16;

  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);

  const [selectedCourseId, setSelectedCourseId] =
    useState("");

  const [selectedSectionId, setSelectedSectionId] =
    useState("");

  const [loadingOptions, setLoadingOptions] =
    useState(true);

  const [startingSession, setStartingSession] =
    useState(false);

  const [finalizing, setFinalizing] =
    useState(false);

  const [cameraActive, setCameraActive] =
    useState(false);

  const [scanning, setScanning] =
    useState(false);

  const [session, setSession] =
    useState(null);

  const [scanResult, setScanResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState(
      "Select a course and section to start attendance."
    );

  const [scanHistory, setScanHistory] =
    useState([]);

  /* =========================================================
     LOAD COURSES + SECTIONS
  ========================================================= */

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    setError("");

    try {
      const [courseResponse, sectionResponse] =
        await Promise.all([
          apiRequest("/courses/"),
          apiRequest("/sections/"),
        ]);

      setCourses(
        normalizeList(courseResponse)
      );

      setSections(
        normalizeList(sectionResponse)
      );
    } catch (err) {
      console.error(
        "Teacher attendance option loading failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to load courses and sections."
      );

      setCourses([]);
      setSections([]);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  /* =========================================================
      SHARE ACTIVE SESSION WITH FACE RECOGNITION
      ---------------------------------------------------------
      FaceRecognition.jsx runs as a separate page and has no
      shared React state, so we persist the active attendance
      session ID in localStorage. It is written whenever a
      session becomes ACTIVE (created or resumed) and cleared
      when the session is finalized, reset, or otherwise no
      longer active. FaceRecognition reads this before sending
      its recognition request.
   ========================================================= */

  useEffect(() => {
    if (session?.session_status === "ACTIVE") {
      localStorage.setItem(
        activeSessionStorageKey,
        String(session.attendance_session_id)
      );
    } else {
      localStorage.removeItem(
        activeSessionStorageKey
      );
    }
  }, [session]);

  /* =========================================================
      FILTER BY SELECTED TEACHER
      ---------------------------------------------------------
      A teacher is linked to a course through the sections
      they teach (section.teacher_id === selected teacher).
      Only the courses and sections actually assigned to this
      teacher should appear, so the dropdowns never list
      courses the teacher cannot take attendance for.
   ========================================================= */

  const assignedSections = sections.filter(
    (section) =>
      Number(section.teacher_id) ===
      Number(DEMO_TEACHER_ID)
  );

  const assignedCourseIds = new Set(
    assignedSections.map((section) =>
      String(section.course_id)
    )
  );

  const assignedCourses = courses.filter(
    (course) =>
      assignedCourseIds.has(
        String(course.course_id)
      )
  );

  const availableSections = assignedSections.filter(
    (section) =>
      String(section.course_id) ===
      String(selectedCourseId)
  );

  /* =========================================================
     SELECT COURSE
  ========================================================= */

  const handleCourseChange = (event) => {
    const value = event.target.value;

    setSelectedCourseId(value);
    setSelectedSectionId("");
    setError("");
    setMessage(
      value
        ? "Now select the section."
        : "Select a course and section to start attendance."
    );
  };

  /* =========================================================
     SELECT SECTION
  ========================================================= */

  const handleSectionChange = (event) => {
    const value = event.target.value;

    setSelectedSectionId(value);
    setError("");

    if (value) {
      const selectedSection = sections.find(
        (section) =>
          String(section.section_id) ===
          String(value)
      );

      if (
        selectedSection &&
        String(selectedSection.course_id) !==
          String(selectedCourseId)
      ) {
        setSelectedSectionId("");
        setError(
          "Security check failed: the selected section does not belong to this course."
        );
        return;
      }

      if (
        selectedSection &&
        Number(selectedSection.teacher_id) !==
          DEMO_TEACHER_ID
      ) {
        setError(
          "This teacher is not assigned to the selected section."
        );
        return;
      }

      setMessage(
        "Section verified. You can now start attendance."
      );
    }
  };

  /* =========================================================
     START CAMERA
  ========================================================= */

  const startCamera = async () => {
  setError("");
  setScanResult(null);
  setMessage("Requesting camera access...");

  try {
    if (!window.isSecureContext) {
      throw new Error(
        "Camera requires a secure HTTPS connection."
      );
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "This browser does not provide camera access. Please use Safari on iPhone or Chrome on Android."
      );
    }

    // Stop any previous camera stream.
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    /*
     * Use simple constraints first.
     *
     * This is deliberately less restrictive than the
     * previous 1280x720 + environment-only request.
     *
     * The browser/device chooses the best supported
     * camera resolution.
     */


    let stream;

const isMobileDevice =
  /Android|iPhone|iPad|iPod/i.test(
    navigator.userAgent
  );

if (isMobileDevice) {
  try {
    // Phone → prefer BACK / REAR camera
    stream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            exact: "environment",
          },
        },
        audio: false,
      });
  } catch (mobileCameraError) {
    console.warn(
      "Rear camera unavailable, falling back to available camera:",
      mobileCameraError
    );

    // Fallback if rear camera is unavailable
    stream =
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
  }
} else {
  // Laptop/Desktop → use available camera
  stream =
    await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
}

streamRef.current = stream;
streamRef.current = stream;

    const video = videoRef.current;

    if (!video) {
      stream
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;

      throw new Error(
        "Camera preview is not available."
      );
    }

    /*
     * Important for iPhone Safari.
     */
    video.setAttribute("autoplay", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");

    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;

    video.srcObject = stream;

    /*
     * Wait until the browser has actual video
     * dimensions before considering the camera ready.
     */
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            "Camera opened, but the video preview did not become ready."
          )
        );
      }, 8000);

      const checkVideo = () => {
        if (
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.videoHeight > 0
        ) {
          clearTimeout(timeout);
          resolve();
        } else {
          requestAnimationFrame(checkVideo);
        }
      };

      checkVideo();
    });

    try {
      await video.play();
    } catch (playError) {
      console.warn(
        "Video play request was rejected:",
        playError
      );

      /*
       * On some mobile browsers the stream is already
       * attached even if play() rejects.
       */
      if (
        video.readyState < 2 ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        throw new Error(
          "The camera opened but the video preview could not start."
        );
      }
    }

    setCameraActive(true);

    setMessage(
      "Camera ready. Position the classroom inside the frame."
    );
  } catch (err) {
    console.error(
      "Teacher attendance camera error:",
      err
    );

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);

    let message =
      "Unable to access the camera.";

    switch (err?.name) {
      case "NotAllowedError":
        message =
          "Camera permission was denied. Allow camera access for this site in your browser settings.";
        break;

      case "NotFoundError":
        message =
          "No camera was found on this device.";
        break;

      case "NotReadableError":
        message =
          "The camera is already being used by another app or browser tab.";
        break;

      case "OverconstrainedError":
        message =
          "The requested camera configuration is not supported by this device.";
        break;

      case "SecurityError":
        message =
          "Camera access was blocked by the browser security policy. Use the HTTPS version of this site.";
        break;

      default:
        message =
          err?.message ||
          message;
    }

    setError(message);

    setMessage(
      "Camera could not be started."
    );
  }
};

  /* =========================================================
     STOP CAMERA
  ========================================================= */

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

    setCameraActive(false);
    setScanning(false);
    scanLockRef.current = false;
  }, []);

  /* =========================================================
     START ATTENDANCE SESSION
  ========================================================= */

 const startAttendance = async () => {
  setError("");
  setMessage("");

  if (!selectedCourseId) {
    setError("Please select a course first.");
    return;
  }

  if (!selectedSectionId) {
    setError("Please select a section first.");
    return;
  }

  const selectedSection = sections.find(
    (section) =>
      String(section.section_id) ===
      String(selectedSectionId)
  );

  if (!selectedSection) {
    setError("Selected section could not be found.");
    return;
  }

  // ---------------------------------------------------------
  // Validate course -> section relationship
  // ---------------------------------------------------------

  if (
    String(selectedSection.course_id) !==
    String(selectedCourseId)
  ) {
    setError(
      "Security validation failed: section does not belong to selected course."
    );
    return;
  }

  // ---------------------------------------------------------
  // Validate teacher assignment
  // ---------------------------------------------------------

  if (
    Number(selectedSection.teacher_id) !==
    DEMO_TEACHER_ID
  ) {
    setError(
      "Security validation failed: this teacher is not assigned to the selected section."
    );
    return;
  }

  setStartingSession(true);

  try {
    // =======================================================
    // FIRST: TRY TO CREATE A NEW SESSION
    // =======================================================

    const createdSession = await apiRequest(
      "/attendance-sessions/",
      {
        method: "POST",
        body: JSON.stringify({
          teacher_id: DEMO_TEACHER_ID,
          course_id: Number(selectedCourseId),
          section_id: Number(selectedSectionId),
        }),
      }
    );

    if (!createdSession?.attendance_session_id) {
      throw new Error(
        "Backend created the session but did not return a valid session ID."
      );
    }

    // New session successfully created
    setSession(createdSession);
    setScanHistory([]);
    setScanResult(null);

    setMessage(
      `Attendance session #${createdSession.attendance_session_id} is ACTIVE.`
    );

  } catch (err) {
    console.error(
      "Attendance session creation failed:",
      err
    );

    // =======================================================
    // 409 = ACTIVE SESSION ALREADY EXISTS
    // =======================================================

    if (
      err?.message?.includes("(409)") ||
      err?.message?.includes("already exists")
    ) {
      try {
        // ---------------------------------------------------
        // Load existing attendance sessions
        // ---------------------------------------------------

        const sessionsResponse = await apiRequest(
          "/attendance-sessions/"
        );

        const sessions = normalizeList(
          sessionsResponse
        );

        // ---------------------------------------------------
        // Find today's ACTIVE session for this section
        // ---------------------------------------------------

        const today = new Date()
          .toISOString()
          .slice(0, 10);

        const existingActiveSession =
          sessions.find(
            (item) =>
              Number(item.section_id) ===
                Number(selectedSectionId) &&
              Number(item.teacher_id) ===
                Number(DEMO_TEACHER_ID) &&
              item.session_status === "ACTIVE" &&
              String(item.session_date) === today
          );

        if (!existingActiveSession) {
          throw new Error(
            "The server reported an active session, but the existing session could not be found."
          );
        }

        // ---------------------------------------------------
        // Reuse existing session
        // ---------------------------------------------------

        setSession(existingActiveSession);

        setScanHistory([]);
        setScanResult(null);

        setMessage(
          `Existing active attendance session #${existingActiveSession.attendance_session_id} resumed.`
        );

        return;

      } catch (resumeError) {
        console.error(
          "Unable to resume existing attendance session:",
          resumeError
        );

        setError(
          resumeError?.message ||
            "An active attendance session already exists, but it could not be resumed."
        );

        return;
      }
    }

    // =======================================================
    // OTHER ERROR
    // =======================================================

    setError(
      err?.message ||
        "Unable to start attendance session."
    );

  } finally {
    setStartingSession(false);
  }
};

  /* =========================================================
     CAPTURE CAMERA FRAME
  ========================================================= */

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      throw new Error(
        "Camera is not ready."
      );
    }

    if (video.readyState < 2) {
      throw new Error(
        "Camera frame is not ready yet."
      );
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      throw new Error(
        "Unable to read camera resolution."
      );
    }

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Unable to create image canvas."
      );
    }

    /*
     * Do NOT mirror the classroom image.
     * InsightFace receives the original camera frame.
     */

    context.drawImage(
      video,
      0,
      0,
      width,
      height
    );

    return new Promise(
      (resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(
                new Error(
                  "Failed to capture camera image."
                )
              );
              return;
            }

            resolve(blob);
          },
          "image/jpeg",
          0.92
        );
      }
    );
  };

  /* =========================================================
     SCAN CLASSROOM
  ========================================================= */

  const scanClassroom = async () => {
    if (!session) {
      setError(
        "No active attendance session exists."
      );
      return;
    }

    if (
      session.session_status !==
      "ACTIVE"
    ) {
      setError(
        "This attendance session is no longer active."
      );
      return;
    }

    if (!cameraActive) {
      setError(
        "Start the classroom camera first."
      );
      return;
    }

    if (scanLockRef.current) {
      return;
    }

    scanLockRef.current = true;

    setScanning(true);
    setError("");
    setScanResult(null);
    setMessage(
      "Capturing classroom image and recognizing students..."
    );

    try {
      const imageBlob =
        await captureFrame();

      const formData =
        new FormData();

      /*
       * CRITICAL:
       *
       * The exact active session ID is sent
       * with the classroom image.
       */

      formData.append(
        "attendance_session_id",
        String(
          session.attendance_session_id
        )
      );

      formData.append(
        "image",
        imageBlob,
        `classroom-${Date.now()}.jpg`
      );

      const response =
        await fetch(
          RECOGNITION_URL,
          {
            method: "POST",
            body: formData,
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      let data = null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            `Classroom recognition failed (${response.status}).`
        );
      }

      /*
       * Store the complete backend result.
       *
       * The current backend returns:
       * detected_face_count
       * recognized_count
       * unknown_count
       * present_students
       * recorded_students
       * already_recorded_students
       */

      setScanResult(data);

      setScanHistory(
        (previous) => [
          ...previous,
          {
            id: Date.now(),
            timestamp:
              new Date(),
            data,
          },
        ]
      );

      setMessage(
        data?.message ||
          "Classroom scan completed successfully."
      );
    } catch (err) {
      console.error(
        "Classroom recognition failed:",
        err
      );

      setError(
        err?.message ||
          "Classroom recognition failed."
      );

      setMessage(
        "Scan failed. Correct the issue and try again."
      );
    } finally {
      setScanning(false);

      setTimeout(() => {
        scanLockRef.current = false;
      }, 1000);
    }
  };

  /* =========================================================
     FINALIZE
  ========================================================= */

  const finalizeAttendance = async () => {
    if (!session) {
      setError(
        "There is no active attendance session."
      );
      return;
    }

    if (
      session.session_status !==
      "ACTIVE"
    ) {
      setError(
        "This session has already been finalized."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Finish this attendance session?\n\nStudents not recognized during the session will be marked Absent."
      );

    if (!confirmed) {
      return;
    }

    setFinalizing(true);
    setError("");
    setMessage(
      "Finalizing attendance..."
    );

    try {
      const completed =
        await apiRequest(
          `/attendance-sessions/${session.attendance_session_id}/finalize`,
          {
            method: "POST",
          }
        );

      setSession(completed);

      stopCamera();

      setMessage(
        `Attendance finalized: ${completed.present_students || 0} Present · ${completed.absent_students || 0} Absent.`
      );
    } catch (err) {
      console.error(
        "Attendance finalization failed:",
        err
      );

      setError(
        err?.message ||
          "Attendance could not be finalized."
      );
    } finally {
      setFinalizing(false);
    }
  };

  /* =========================================================
     RESET WORKFLOW
  ========================================================= */

  const resetWorkflow = () => {
    stopCamera();

    setSession(null);
    setScanResult(null);
    setScanHistory([]);

    setSelectedCourseId("");
    setSelectedSectionId("");

    setError("");

    setMessage(
      "Select a course and section to start attendance."
    );
  };

  /* =========================================================
     CLEANUP
  ========================================================= */

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }
    };
  }, []);

  /* =========================================================
     SELECTED DATA
  ========================================================= */

  const selectedCourse =
    courses.find(
      (course) =>
        String(course.course_id) ===
        String(selectedCourseId)
    );

  const selectedSection =
    sections.find(
      (section) =>
        String(section.section_id) ===
        String(selectedSectionId)
    );

  const isActiveSession =
    session?.session_status ===
    "ACTIVE";

  const isCompleted =
    session?.session_status ===
    "COMPLETED";

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "10px 0",
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="card"
        style={{
          padding: "26px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "flex-start",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 11px",
                borderRadius: "20px",
                background:
                  isActiveSession
                    ? "#dcfce7"
                    : isCompleted
                    ? "#e0f2fe"
                    : "#f1f5f9",
                color:
                  isActiveSession
                    ? "#15803d"
                    : isCompleted
                    ? "#0369a1"
                    : "#64748b",
                fontSize: "12px",
                fontWeight: 800,
                marginBottom: "12px",
              }}
            >
              <span>
                {isActiveSession
                  ? "●"
                  : isCompleted
                  ? "✓"
                  : "○"}
              </span>

              {isActiveSession
                ? "ATTENDANCE ACTIVE"
                : isCompleted
                ? "SESSION COMPLETED"
                : "READY TO START"}
            </div>

            <h2
              style={{
                margin: 0,
                color: "#0f172a",
                fontSize: "28px",
              }}
            >
              Teacher Attendance
            </h2>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#64748b",
              }}
            >
              Select the assigned course and
              section, then scan the classroom.
            </p>
          </div>

          {session && (
            <div
              style={{
                minWidth: "210px",
                padding: "14px 16px",
                border:
                  "1px solid #e2e8f0",
                borderRadius: "12px",
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  color: "#64748b",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                ATTENDANCE SESSION
              </div>

              <strong
                style={{
                  display: "block",
                  marginTop: "4px",
                  color: "#0f172a",
                  fontSize: "22px",
                }}
              >
                #{session.attendance_session_id}
              </strong>

              <div
                style={{
                  marginTop: "5px",
                  color: "#64748b",
                  fontSize: "12px",
                }}
              >
                {session.session_date}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          COURSE / SECTION SELECTION
      ===================================================== */}

      {!session && (
        <div
          className="card"
          style={{
            padding: "26px",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "18px",
            }}
          >
            <div>
              <label
                style={labelStyle}
              >
                Course
              </label>

              <select
                value={
                  selectedCourseId
                }
                onChange={
                  handleCourseChange
                }
                disabled={
                  loadingOptions ||
                  startingSession
                }
                style={inputStyle}
              >
                <option value="">
                  {loadingOptions
                    ? "Loading courses..."
                    : assignedCourses.length
                    ? "Select Course"
                    : "No courses assigned to you"}
                </option>

                {assignedCourses.map(
                  (course) => (
                    <option
                      key={
                        course.course_id
                      }
                      value={
                        course.course_id
                      }
                    >
                      {course.course_code} —{" "}
                      {course.course_name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                style={labelStyle}
              >
                Section
              </label>

              <select
                value={
                  selectedSectionId
                }
                onChange={
                  handleSectionChange
                }
                disabled={
                  !selectedCourseId ||
                  loadingOptions ||
                  startingSession
                }
                style={inputStyle}
              >
                <option value="">
                  {!selectedCourseId
                    ? "Select course first"
                    : availableSections.length
                    ? "Select Section"
                    : "No sections for this course"}
                </option>

                {availableSections.map(
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

          {selectedCourse &&
            selectedSection && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "16px",
                  background: "#f8fafc",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <Info
                    label="Course"
                    value={
                      selectedCourse.course_code
                    }
                  />

                  <Info
                    label="Section"
                    value={
                      selectedSection.section_name
                    }
                  />

                  <Info
                    label="Room"
                    value={
                      selectedSection.room_number ||
                      "—"
                    }
                  />

                  <Info
                    label="Assigned Teacher"
                    value={
                      `Teacher #${selectedSection.teacher_id}`
                    }
                  />
                </div>
              </div>
            )}

          {error && (
            <ErrorBox message={error} />
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "22px",
            }}
          >
            <button
              type="button"
              onClick={loadOptions}
              disabled={
                loadingOptions ||
                startingSession
              }
              style={secondaryButtonStyle}
            >
              ↻ Refresh
            </button>

            <button
              type="button"
              onClick={
                startAttendance
              }
              disabled={
                startingSession ||
                loadingOptions ||
                !selectedCourseId ||
                !selectedSectionId
              }
              style={{
                ...primaryButtonStyle,
                opacity:
                  startingSession ||
                  !selectedCourseId ||
                  !selectedSectionId
                    ? 0.6
                    : 1,
              }}
            >
              {startingSession
                ? "Starting Session..."
                : "▶ Start Attendance"}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          ACTIVE SESSION
      ===================================================== */}

      {session && (
        <>
          <div
            className="card"
            style={{
              padding: "20px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "14px",
              }}
            >
              <Metric
                label="Total Students"
                value={
                  session.total_students ??
                  0
                }
              />

              <Metric
                label="Present"
                value={
                  session.present_students ??
                  0
                }
              />

              <Metric
                label="Absent"
                value={
                  session.absent_students ??
                  0
                }
              />

              <Metric
                label="Status"
                value={
                  session.session_status
                }
              />
            </div>
          </div>

          {/* CAMERA */}

          <div
            className="card"
            style={{
              padding: "24px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "15px",
                flexWrap: "wrap",
                marginBottom: "18px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: "#0f172a",
                  }}
                >
                  Classroom Face Recognition
                </h3>

                <p
                  style={{
                    margin:
                      "6px 0 0",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  Scan the classroom. You can
                  scan repeatedly during the
                  active session.
                </p>
              </div>

              <div
                style={{
                  padding:
                    "7px 12px",
                  borderRadius:
                    "20px",
                  background:
                    cameraActive
                      ? "#dcfce7"
                      : "#f1f5f9",
                  color:
                    cameraActive
                      ? "#15803d"
                      : "#64748b",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                {cameraActive
                  ? "● CAMERA LIVE"
                  : "○ CAMERA OFF"}
              </div>
            </div>

            {error && (
              <ErrorBox message={error} />
            )}

            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "1000px",
                margin: "0 auto",
                aspectRatio: "16 / 9",
                background: "#020617",
                borderRadius: "16px",
                overflow: "hidden",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                   transform: "none",
                  display:
                    cameraActive
                      ? "block"
                      : "none",
                }}
              />

              <canvas
                ref={canvasRef}
                style={{
                  display: "none",
                }}
              />

              {!cameraActive && (
                <div
                  style={{
                    position:
                      "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection:
                      "column",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    color: "#fff",
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "52px",
                      marginBottom:
                        "12px",
                    }}
                  >
                    📷
                  </div>

                  <strong
                    style={{
                      fontSize: "21px",
                    }}
                  >
                    Classroom Camera
                  </strong>

                  <span
                    style={{
                      marginTop:
                        "8px",
                      color:
                        "#cbd5e1",
                      fontSize: "13px",
                    }}
                  >
                    Start the camera when
                    the teacher is ready to
                    scan.
                  </span>
                </div>
              )}

              {cameraActive && (
                <div
                  style={{
                    position:
                      "absolute",
                    inset: "6%",
                    border:
                      "2px solid rgba(255,255,255,0.8)",
                    borderRadius:
                      "16px",
                    pointerEvents:
                      "none",
                  }}
                />
              )}

              {scanning && (
                <div
                  style={{
                    position:
                      "absolute",
                    inset: 0,
                    background:
                      "rgba(2,6,23,0.55)",
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    color: "#fff",
                    fontSize:
                      "18px",
                    fontWeight: 800,
                  }}
                >
                  🔍 Recognizing classroom...
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "center",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "20px",
              }}
            >
              {!cameraActive && (
                <button
                  type="button"
                  onClick={
                    startCamera
                  }
                  disabled={
                    !isActiveSession
                  }
                  style={{
                    ...primaryButtonStyle,
                    opacity:
                      !isActiveSession
                        ? 0.5
                        : 1,
                  }}
                >
                  📷 Start Camera
                </button>
              )}

              {cameraActive && (
                <>
                  <button
                    type="button"
                    onClick={
                      scanClassroom
                    }
                    disabled={
                      scanning ||
                      !isActiveSession
                    }
                    style={{
                      ...primaryButtonStyle,
                      background:
                        "#16a34a",
                    }}
                  >
                    {scanning
                      ? "Recognizing..."
                      : "📸 Scan Classroom"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      stopCamera
                    }
                    disabled={
                      scanning
                    }
                    style={
                      secondaryButtonStyle
                    }
                  >
                    Stop Camera
                  </button>
                </>
              )}
            </div>

            <div
              style={{
                textAlign: "center",
                marginTop: "15px",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              {message}
            </div>
          </div>

          {/* =================================================
              LATEST SCAN RESULT
          ================================================= */}

          {scanResult && (
            <div
              className="card"
              style={{
                padding: "22px",
                marginBottom: "18px",
              }}
            >
              <h3
                style={{
                  margin:
                    "0 0 16px",
                  color: "#0f172a",
                }}
              >
                Latest Scan
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "12px",
                  marginBottom:
                    "18px",
                }}
              >
                <Metric
                  label="Faces Detected"
                  value={
                    scanResult.detected_face_count ??
                    0
                  }
                />

                <Metric
                  label="Recognized"
                  value={
                    scanResult.recognized_count ??
                    0
                  }
                />

                <Metric
                  label="Unknown"
                  value={
                    scanResult.unknown_count ??
                    0
                  }
                />

                <Metric
                  label="Present"
                  value={
                    scanResult.present_students ??
                    0
                  }
                />
              </div>

              {Array.isArray(
                scanResult.recorded_students
              ) &&
                scanResult.recorded_students
                  .length > 0 && (
                  <div>
                    <h4
                      style={{
                        margin:
                          "0 0 10px",
                        color:
                          "#15803d",
                      }}
                    >
                      Newly Recorded
                    </h4>

                    <div
                      style={{
                        display:
                          "grid",
                        gap: "8px",
                      }}
                    >
                      {scanResult.recorded_students.map(
                        (student) => (
                          <div
                            key={
                              `${student.student_id}-${student.attendance_id}`
                            }
                            style={{
                              padding:
                                "12px 14px",
                              border:
                                "1px solid #bbf7d0",
                              background:
                                "#f0fdf4",
                              borderRadius:
                                "9px",
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              gap: "12px",
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <strong>
                              {student.student_name}
                            </strong>

                            <span
                              style={{
                                color:
                                  "#15803d",
                                fontWeight:
                                  700,
                              }}
                            >
                              Present
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {Array.isArray(
                scanResult.already_recorded_students
              ) &&
                scanResult
                  .already_recorded_students
                  .length > 0 && (
                  <div
                    style={{
                      marginTop:
                        "15px",
                      padding:
                        "12px 14px",
                      background:
                        "#eff6ff",
                      border:
                        "1px solid #bfdbfe",
                      borderRadius:
                        "9px",
                      color:
                        "#1d4ed8",
                      fontSize:
                        "13px",
                    }}
                  >
                    ✓ Some students were
                    already recorded in this
                    attendance session. No
                    duplicate attendance rows
                    were created.
                  </div>
                )}
            </div>
          )}

          {/* =================================================
              FINALIZE
          ================================================= */}

          <div
            className="card"
            style={{
              padding: "22px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "18px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: "#0f172a",
                  }}
                >
                  {isCompleted
                    ? "Attendance Completed"
                    : "Finish Attendance"}
                </h3>

                <p
                  style={{
                    margin:
                      "6px 0 0",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  {isCompleted
                    ? `${session.present_students || 0} Present · ${session.absent_students || 0} Absent`
                    : "When finished, students not recorded as Present or Late will be marked Absent."}
                </p>
              </div>

              {!isCompleted ? (
                <button
                  type="button"
                  onClick={
                    finalizeAttendance
                  }
                  disabled={
                    finalizing ||
                    scanning
                  }
                  style={{
                    ...primaryButtonStyle,
                    background:
                      "#0f766e",
                  }}
                >
                  {finalizing
                    ? "Finalizing..."
                    : "✓ End & Finalize Attendance"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={
                    resetWorkflow
                  }
                  style={
                    secondaryButtonStyle
                  }
                >
                  Start New Session
                </button>
              )}
            </div>
          </div>

          {/* =================================================
              SCAN HISTORY
          ================================================= */}

          {scanHistory.length >
            0 && (
            <div
              className="card"
              style={{
                padding: "22px",
                marginTop: "18px",
              }}
            >
              <h3
                style={{
                  margin:
                    "0 0 15px",
                  color: "#0f172a",
                }}
              >
                Scan Activity
              </h3>

              <div
                style={{
                  display:
                    "grid",
                  gap: "8px",
                }}
              >
                {scanHistory.map(
                  (item, index) => (
                    <div
                      key={item.id}
                      style={{
                        padding:
                          "11px 13px",
                        background:
                          "#f8fafc",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius:
                          "8px",
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          color:
                            "#475569",
                          fontSize:
                            "13px",
                        }}
                      >
                        Scan #{index + 1}
                      </span>

                      <strong
                        style={{
                          color:
                            "#0f172a",
                          fontSize:
                            "13px",
                        }}
                      >
                        {item.data
                          ?.recognized_count ??
                          0}{" "}
                        recognized
                      </strong>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function Info({ label, value }) {
  return (
    <div>
      <div
        style={{
          color: "#64748b",
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display: "block",
          marginTop: "4px",
          color: "#0f172a",
          fontSize: "14px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div
      style={{
        padding: "14px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display: "block",
          marginTop: "5px",
          color: "#0f172a",
          fontSize: "21px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div
      style={{
        background: "#fff1f2",
        border:
          "1px solid #fecdd3",
        color: "#be123c",
        padding:
          "12px 14px",
        borderRadius: "9px",
        marginBottom:
          "16px",
        fontSize: "13px",
      }}
    >
      ⚠️ {message}
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  border:
    "1px solid #cbd5e1",
  borderRadius: "9px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px",
  outline: "none",
};

const primaryButtonStyle = {
  border: "none",
  background: "#2563eb",
  color: "#ffffff",
  padding: "12px 20px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "14px",
};

const secondaryButtonStyle = {
  border:
    "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  padding: "12px 18px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "14px",
};

export default TeacherAttendance;