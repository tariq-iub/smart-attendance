import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

const RECOGNITION_URL = `${API_BASE}/attendance/recognize`;

/* =========================================================
   ERROR DETAIL FORMATTING
   ---------------------------------------------------------
   FastAPI returns error details as either a string, an
   object, or (for 422 validation) an array of objects.
   Always coerce this into a readable string so the UI
   never renders "[object Object]".
========================================================= */

function formatErrorDetail(detail) {
  if (detail == null) {
    return null;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        const field = Array.isArray(item?.loc)
          ? item.loc.join(".")
          : "request";

        return `${field}: ${item?.msg || JSON.stringify(item)}`;
      })
      .join("; ");
  }

  if (typeof detail === "object") {
    return (
      detail?.message ||
      detail?.msg ||
      JSON.stringify(detail)
    );
  }

  return String(detail);
}

function FaceRecognition() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionLockRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [message, setMessage] = useState(
    "Start the camera and position your face inside the frame."
  );
  const [result, setResult] = useState(null);

  /* =========================================================
     RESOLVE ACTIVE ATTENDANCE SESSION
     ---------------------------------------------------------
     The /attendance/recognize endpoint requires a valid
     attendance_session_id. This helper obtains one without
     requiring manual Teacher Attendance setup:

     1. Reuse an existing active session from localStorage
        (created by TeacherAttendance if the user went there
        first).
     2. Otherwise, find a section with an assigned teacher
        via /sections/, then either reuse today's active
        session or create a new one via POST /attendance-sessions/.
     3. Persist the resolved session ID so subsequent scans
        in the same browser session reuse it.
  ========================================================= */

  const resolveActiveSession = async () => {
    const stored = localStorage.getItem(
      "smart_attendance_active_session_id"
    );

    if (stored) {
      return stored;
    }

    const sectionsResponse = await fetch(
      `${API_BASE}/sections/`,
      {
        headers: { Accept: "application/json" },
      }
    );

    if (!sectionsResponse.ok) {
      throw new Error(
        "Unable to load sections to prepare face recognition."
      );
    }

    const sectionsData = await sectionsResponse.json();

    const sections = Array.isArray(sectionsData)
      ? sectionsData
      : Array.isArray(sectionsData?.data)
        ? sectionsData.data
        : Array.isArray(sectionsData?.items)
          ? sectionsData.items
          : [];

    const assignedSection = sections.find(
      (section) =>
        Number(section.teacher_id) > 0 &&
        Number(section.course_id) > 0 &&
        Number(section.section_id) > 0
    );

    if (!assignedSection) {
      throw new Error(
        "No section with an assigned teacher was found. Assign a teacher to a section first."
      );
    }

    const sessionsResponse = await fetch(
      `${API_BASE}/attendance-sessions/`,
      {
        headers: { Accept: "application/json" },
      }
    );

    let sessions = [];

    if (sessionsResponse.ok) {
      const sessionsData =
        await sessionsResponse.json();

      sessions = Array.isArray(sessionsData)
        ? sessionsData
        : Array.isArray(sessionsData?.data)
          ? sessionsData.data
          : Array.isArray(sessionsData?.items)
            ? sessionsData.items
            : [];
    }

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    const existingActive = sessions.find(
      (item) =>
        Number(item.section_id) ===
          Number(assignedSection.section_id) &&
        Number(item.teacher_id) ===
          Number(assignedSection.teacher_id) &&
        String(item.session_date) === today &&
        String(item.session_status).toLowerCase() ===
          "active"
    );

    if (existingActive?.attendance_session_id) {
      localStorage.setItem(
        "smart_attendance_active_session_id",
        String(existingActive.attendance_session_id)
      );

      return String(
        existingActive.attendance_session_id
      );
    }

    const createResponse = await fetch(
      `${API_BASE}/attendance-sessions/`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          teacher_id:
            assignedSection.teacher_id,
          course_id:
            assignedSection.course_id,
          section_id:
            assignedSection.section_id,
        }),
      }
    );

    if (!createResponse.ok) {
      const errorData =
        await createResponse.json().catch(
          () => null
        );

      const detail =
        errorData?.detail ||
        errorData?.message ||
        `Session creation failed (${createResponse.status}).`;

      throw new Error(
        typeof detail === "string"
          ? detail
          : JSON.stringify(detail)
      );
    }

    const createdSession =
      await createResponse.json();

    const sessionId =
      createdSession?.attendance_session_id ||
      createdSession?.id;

    if (!sessionId) {
      throw new Error(
        "The server did not return a valid attendance session ID."
      );
    }

    localStorage.setItem(
      "smart_attendance_active_session_id",
      String(sessionId)
    );

    return String(sessionId);
  };

  /* =========================================================
     START CAMERA
  ========================================================= */

  const startCamera = async () => {
    setCameraError("");
    setResult(null);
    setMessage("Requesting camera access...");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Your browser does not support webcam access."
        );
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error("Camera element is not available.");
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCameraActive(true);
      setMessage(
        "Camera ready. Position your face inside the frame."
      );
    } catch (error) {
      console.error("Camera error:", error);

      setCameraActive(false);

      setCameraError(
        error?.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in Chrome."
          : error?.message || "Unable to access the camera."
      );

      setMessage("Camera could not be started.");
    }
  };

  /* =========================================================
     STOP CAMERA
  ========================================================= */

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setRecognizing(false);
    recognitionLockRef.current = false;
    setMessage("Camera stopped.");
  }, []);

  /* =========================================================
     CAPTURE CURRENT VIDEO FRAME
  ========================================================= */

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      throw new Error("Camera is not ready.");
    }

    if (video.readyState < 2) {
      throw new Error("Camera frame is not ready yet.");
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      throw new Error("Unable to read camera resolution.");
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to create image canvas.");
    }

    /*
      The video is visually mirrored using CSS.
      We capture the real camera frame without mirroring it.
      InsightFace receives the original image.
    */
    context.drawImage(video, 0, 0, width, height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to capture camera image."));
            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        0.92
      );
    });
  };

  /* =========================================================
     NORMALIZE BACKEND RESPONSE
  ========================================================= */

  const normalizeRecognitionResult = (data) => {
    const student =
      data?.student ||
      data?.recognized_student ||
      data?.student_data ||
      {};

    const studentId =
      data?.student_id ??
      student?.student_id ??
      student?.id ??
      null;

    const studentName =
      data?.student_name ||
      student?.student_name ||
      student?.full_name ||
      [student?.first_name, student?.last_name]
        .filter(Boolean)
        .join(" ") ||
      "Recognized Student";

    const confidenceValue =
      data?.confidence ??
      data?.confidence_score ??
      data?.similarity ??
      null;

    const confidence =
      confidenceValue !== null
        ? Number(confidenceValue)
        : null;

    return {
      success:
        data?.success !== false &&
        data?.recognized !== false &&
        data?.matched !== false,

      studentId,

      studentName,

      confidence: Number.isFinite(confidence)
        ? confidence
        : null,

      status:
        data?.status ||
        data?.attendance_status ||
        "Present",

      method:
        data?.method ||
        data?.recognition_method ||
        "Face Recognition",

      attendanceId:
        data?.attendance_id ??
        data?.attendance_record_id ??
        data?.record_id ??
        null,

      message:
        data?.message ||
        "Attendance recorded successfully.",
    };
  };

  /* =========================================================
     START RECOGNITION
  ========================================================= */

  const startRecognition = async () => {
    if (!cameraActive) {
      setMessage("Start the camera first.");
      return;
    }

    if (recognitionLockRef.current) {
      return;
    }

    recognitionLockRef.current = true;

    setRecognizing(true);
    setCameraError("");
    setResult(null);
    setMessage(
      "Preparing attendance session and verifying identity..."
    );

    try {
      const attendanceSessionId =
        await resolveActiveSession();

      /*
        Capture the current webcam frame.
      */
      const imageBlob = await captureFrame();

      /*
        Send image as multipart/form-data.
        FastAPI receives it as UploadFile.
      */
      const formData = new FormData();

      formData.append(
        "attendance_session_id",
        attendanceSessionId
      );

      formData.append(
        "image",
        imageBlob,
        `face-${Date.now()}.jpg`
      );

      /*
        Existing project architecture:
        POST /attendance/recognize

        The backend is responsible for:
        1. Face detection
        2. InsightFace recognition
        3. Student identification
        4. Confidence validation
        5. Active-session validation
        6. Duplicate-attendance validation
        7. PostgreSQL attendance creation
      */
      const response = await fetch(RECOGNITION_URL, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const rawDetail =
          data?.detail ?? data?.message ?? null;

        const backendMessage =
          formatErrorDetail(rawDetail) ||
          `Recognition failed with HTTP ${response.status}.`;

        throw new Error(backendMessage);
      }

      const normalized = normalizeRecognitionResult(data);

      setResult(normalized);

      if (!normalized.success) {
        setMessage(
          normalized.message ||
            "Face could not be recognized."
        );

        return;
      }

      setMessage(
        normalized.message ||
          "Identity verified and attendance recorded."
      );
    } catch (error) {
      console.error("Face recognition error:", error);

      setResult(null);

      setCameraError(
        error?.message ||
          "Unable to connect to the face recognition service."
      );

      setMessage(
        "Recognition failed. Please try again."
      );
    } finally {
      setRecognizing(false);

      /*
        Prevent accidental double attendance requests.
      */
      setTimeout(() => {
        recognitionLockRef.current = false;
      }, 1500);
    }
  };

  /* =========================================================
     CLEANUP
  ========================================================= */

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "18px",
        padding: "30px",
        minHeight: "600px",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "28px",
              color: "#0f172a",
            }}
          >
            AI Face Recognition
          </h2>

          <p
            style={{
              marginTop: "8px",
              color: "#64748b",
            }}
          >
            Secure camera-based attendance verification
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: cameraActive
              ? "#dcfce7"
              : "#f1f5f9",
            color: cameraActive
              ? "#15803d"
              : "#64748b",
            padding: "9px 15px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: cameraActive
                ? "#22c55e"
                : "#94a3b8",
            }}
          />

          {cameraActive
            ? "CAMERA LIVE"
            : "CAMERA OFF"}
        </div>
      </div>

      {/* ERROR */}

      {cameraError && (
        <div
          style={{
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            color: "#be123c",
            padding: "14px 16px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          ⚠️ {cameraError}
        </div>
      )}

      {/* SUCCESS RESULT */}

      {result?.success && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "14px",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              color: "#15803d",
              fontWeight: 800,
              fontSize: "18px",
              marginBottom: "10px",
            }}
          >
            ✓ Attendance Recorded
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <small style={{ color: "#64748b" }}>
                Student
              </small>

              <div
                style={{
                  fontWeight: 700,
                  color: "#0f172a",
                  marginTop: "4px",
                }}
              >
                {result.studentName}
              </div>
            </div>

            <div>
              <small style={{ color: "#64748b" }}>
                Student ID
              </small>

              <div
                style={{
                  fontWeight: 700,
                  color: "#0f172a",
                  marginTop: "4px",
                }}
              >
                {result.studentId ?? "—"}
              </div>
            </div>

            <div>
              <small style={{ color: "#64748b" }}>
                Confidence
              </small>

              <div
                style={{
                  fontWeight: 700,
                  color: "#0f172a",
                  marginTop: "4px",
                }}
              >
                {result.confidence !== null
                  ? `${(
                      result.confidence <= 1
                        ? result.confidence * 100
                        : result.confidence
                    ).toFixed(1)}%`
                  : "Verified"}
              </div>
            </div>

            <div>
              <small style={{ color: "#64748b" }}>
                Method
              </small>

              <div
                style={{
                  fontWeight: 700,
                  color: "#0f172a",
                  marginTop: "4px",
                }}
              >
                {result.method}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAMERA */}

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
          background: "#0f172a",
          borderRadius: "18px",
          overflow: "hidden",
          aspectRatio: "16 / 9",
          boxShadow:
            "0 12px 35px rgba(15, 23, 42, 0.15)",
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
            display: cameraActive
              ? "block"
              : "none",
            transform: "scaleX(-1)",
          }}
        />

        <canvas
          ref={canvasRef}
          style={{ display: "none" }}
        />

        {!cameraActive && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "55px",
                marginBottom: "12px",
              }}
            >
              ◉
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: "22px",
              }}
            >
              Face Recognition Ready
            </h3>

            <p
              style={{
                color: "#cbd5e1",
                marginTop: "10px",
              }}
            >
              Start the camera to begin verification.
            </p>
          </div>
        )}

        {cameraActive && (
          <>
            <div
              style={{
                position: "absolute",
                inset: "12%",
                border:
                  "2px solid rgba(255,255,255,0.85)",
                borderRadius: "20px",
                pointerEvents: "none",
                boxShadow:
                  "0 0 0 9999px rgba(15,23,42,0.08)",
              }}
            />

            <div
              style={{
                position: "absolute",
                top: "20px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#2563eb",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              Position face here
            </div>

            {recognizing && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "rgba(15,23,42,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "18px",
                }}
              >
                Verifying identity...
              </div>
            )}
          </>
        )}
      </div>

      {/* STATUS */}

      <div
        style={{
          textAlign: "center",
          marginTop: "20px",
          color: "#475569",
          fontSize: "14px",
          fontWeight: 500,
        }}
      >
        {message}
      </div>

      {/* CONTROLS */}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          marginTop: "20px",
          flexWrap: "wrap",
        }}
      >
        {!cameraActive ? (
          <button
            type="button"
            onClick={startCamera}
            style={{
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              padding: "13px 28px",
              borderRadius: "9px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            📷 Start Camera
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={startRecognition}
              disabled={recognizing}
              style={{
                border: "none",
                background: recognizing
                  ? "#94a3b8"
                  : "#16a34a",
                color: "#ffffff",
                padding: "13px 28px",
                borderRadius: "9px",
                cursor: recognizing
                  ? "not-allowed"
                  : "pointer",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              {recognizing
                ? "⏳ Verifying..."
                : "✓ Start Recognition"}
            </button>

            <button
              type="button"
              onClick={stopCamera}
              disabled={recognizing}
              style={{
                border: "1px solid #dc2626",
                background: "#ffffff",
                color: "#dc2626",
                padding: "13px 28px",
                borderRadius: "9px",
                cursor: recognizing
                  ? "not-allowed"
                  : "pointer",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              Stop Camera
            </button>
          </>
        )}
      </div>

      {/* PROFESSIONAL INFORMATION PANEL */}

      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
        }}
      >
        <strong
          style={{
            color: "#0f172a",
            fontSize: "15px",
          }}
        >
          Automated Attendance Verification
        </strong>

        <p
          style={{
            margin: "8px 0 0",
            color: "#64748b",
            fontSize: "13px",
            lineHeight: 1.7,
          }}
        >
          The captured face is securely submitted to the
          FastAPI recognition service. InsightFace verifies
          the identity and the attendance engine records the
          verified result in PostgreSQL.
        </p>
      </div>
    </div>
  );
}

export default FaceRecognition;