import json
import sys

import cv2
import numpy as np
from sqlalchemy import text

from app.database.connection import SessionLocal
from app.services.ai.face_engine import face_engine


MATCH_THRESHOLD = 0.45


# =========================================================
# FACE ENROLLMENT
# =========================================================
def enroll(student_id: int):
    db = SessionLocal()
    camera = cv2.VideoCapture(0)

    if not camera.isOpened():
        print("ERROR: Could not open webcam.")
        db.close()
        return

    print("===================================")
    print("SMART ATTENDANCE - FACE ENROLLMENT")
    print("===================================")
    print("Look at the camera.")
    print("Press SPACE to capture.")
    print("Press Q to cancel.")

    embedding = None

    try:
        while True:
            ok, frame = camera.read()

            if not ok:
                print("ERROR: Could not read webcam.")
                break

            faces = face_engine.detect(frame)

            for face in faces:
                x1, y1, x2, y2 = map(int, face.bbox)

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 255, 0),
                    2,
                )

                cv2.putText(
                    frame,
                    "Face detected - Press SPACE",
                    (x1, max(y1 - 10, 30)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 0),
                    2,
                )

            cv2.imshow(
                "Smart Attendance - Face Enrollment",
                frame,
            )

            key = cv2.waitKey(1) & 0xFF

            # Q = cancel
            if key == ord("q"):
                print("Enrollment cancelled.")
                break

            # SPACE = capture
            if key == 32:
                embedding = face_engine.embedding_from_image(frame)

                if embedding is not None:
                    print("Face captured successfully.")
                    break

                print("No face detected. Please try again.")

    finally:
        camera.release()
        cv2.destroyAllWindows()

    if embedding is None:
        db.close()
        print("ENROLLMENT CANCELLED")
        return

    # =====================================================
    # CHECK STUDENT
    # =====================================================
    student_exists = db.execute(
        text(
            """
            SELECT student_id
            FROM academic.student
            WHERE student_id = :student_id
            """
        ),
        {"student_id": student_id},
    ).first()

    if student_exists is None:
        db.close()
        print(f"ERROR: Student {student_id} does not exist.")
        return

    # =====================================================
    # NORMALIZE EMBEDDING
    # =====================================================
    embedding = np.asarray(
        embedding,
        dtype=np.float32,
    )

    norm = np.linalg.norm(embedding)

    if norm == 0:
        db.close()
        print("ERROR: Invalid face embedding.")
        return

    embedding = embedding / norm

    embedding_json = json.dumps(
        embedding.tolist()
    )

    # =====================================================
    # DEACTIVATE OLD EMBEDDINGS
    # =====================================================
    db.execute(
        text(
            """
            UPDATE ai.face_embedding
            SET
                is_active = FALSE,
                updated_at = NOW()
            WHERE student_id = :student_id
            """
        ),
        {"student_id": student_id},
    )

    # =====================================================
    # SAVE NEW EMBEDDING
    # =====================================================
    db.execute(
        text(
            """
            INSERT INTO ai.face_embedding
            (
                student_id,
                embedding_vector,
                model_name,
                embedding_version,
                is_active,
                created_at,
                updated_at
            )
            VALUES
            (
                :student_id,
                :embedding_vector,
                :model_name,
                :embedding_version,
                TRUE,
                NOW(),
                NOW()
            )
            """
        ),
        {
            "student_id": student_id,
            "embedding_vector": embedding_json,
            "model_name": "InsightFace-ArcFace",
            "embedding_version": "buffalo_l",
        },
    )

    db.commit()
    db.close()

    print("===================================")
    print("FACE ENROLLMENT: SUCCESS")
    print("STUDENT ID:", student_id)
    print("MODEL: InsightFace ArcFace")
    print("===================================")


# =========================================================
# FACE RECOGNITION + ATTENDANCE
# =========================================================
def recognize(attendance_session_id: int):
    db = SessionLocal()

    # =====================================================
    # CHECK SESSION
    # =====================================================
    session_exists = db.execute(
        text(
            """
            SELECT attendance_session_id
            FROM attendance.attendance_session
            WHERE attendance_session_id = :session_id
            """
        ),
        {
            "session_id": attendance_session_id
        },
    ).first()

    if session_exists is None:
        db.close()
        print(
            f"ERROR: Attendance session "
            f"{attendance_session_id} does not exist."
        )
        return

    # =====================================================
    # LOAD REGISTERED FACE EMBEDDINGS
    # =====================================================
    rows = db.execute(
        text(
            """
            SELECT
                student_id,
                embedding_vector
            FROM ai.face_embedding
            WHERE is_active = TRUE
            """
        )
    ).fetchall()

    if not rows:
        db.close()

        print("===================================")
        print("NO REGISTERED FACE EMBEDDINGS")
        print("Enroll a student first.")
        print("===================================")

        return

    known_faces = []

    for row in rows:
        try:
            vector = np.array(
                json.loads(row.embedding_vector),
                dtype=np.float32,
            )

            norm = np.linalg.norm(vector)

            if norm == 0:
                continue

            vector = vector / norm

            known_faces.append(
                (
                    row.student_id,
                    vector,
                )
            )

        except Exception as error:
            print(
                f"WARNING: Could not load embedding "
                f"for student {row.student_id}: {error}"
            )

    if not known_faces:
        db.close()
        print("ERROR: No valid face embeddings found.")
        return

    # =====================================================
    # OPEN WEBCAM
    # =====================================================
    camera = cv2.VideoCapture(0)

    if not camera.isOpened():
        db.close()
        print("ERROR: Could not open webcam.")
        return

    print("===================================")
    print("SMART ATTENDANCE RECOGNITION")
    print("===================================")
    print("Look at the camera.")
    print("Press Q to stop.")
    print("===================================")

    marked_students = set()

    try:
        while True:
            ok, frame = camera.read()

            if not ok:
                print("ERROR: Could not read webcam.")
                break

            faces = face_engine.detect(frame)

            for face in faces:
                x1, y1, x2, y2 = map(
                    int,
                    face.bbox,
                )

                # =========================================
                # GET CURRENT FACE EMBEDDING
                # =========================================
                embedding = face.normed_embedding.astype(
                    np.float32
                )

                norm = np.linalg.norm(embedding)

                if norm == 0:
                    continue

                embedding = embedding / norm

                # =========================================
                # FIND BEST MATCH
                # =========================================
                best_student = None
                best_score = -1.0

                for student_id, known_embedding in known_faces:

                    score = face_engine.similarity(
                        embedding,
                        known_embedding,
                    )

                    if score > best_score:
                        best_score = score
                        best_student = student_id

                # =========================================
                # MATCH FOUND
                # =========================================
                if (
                    best_student is not None
                    and best_score >= MATCH_THRESHOLD
                ):
                    label = (
                        f"Student {best_student} | "
                        f"{best_score:.2f}"
                    )

                    # =====================================
                    # MARK ATTENDANCE ONLY ONCE
                    # =====================================
                    if best_student not in marked_students:

                        # Check if already marked in this session
                        already_marked = db.execute(
                            text(
                                """
                                SELECT attendance_id
                                FROM attendance.attendance
                                WHERE attendance_session_id =
                                      :session_id
                                  AND student_id = :student_id
                                LIMIT 1
                                """
                            ),
                            {
                                "session_id":
                                    attendance_session_id,
                                "student_id":
                                    best_student,
                            },
                        ).first()

                        if already_marked is None:

                            db.execute(
                                text(
                                    """
                                    INSERT INTO attendance.attendance
(
    attendance_session_id,
    student_id,
    attendance_status,
    check_in_time,
    confidence_score,
    verification_method,
    created_at,
    updated_at
)
VALUES
(
    :session_id,
    :student_id,
    'present',
    CURRENT_TIMESTAMP,
    :confidence,
    'face_recognition',
    NOW(),
    NOW()
)
                                    """
                                ),
                                {
                                    "session_id":
                                        attendance_session_id,
                                    "student_id":
                                        best_student,
                                    "confidence":
                                        float(best_score * 100),
                                },
                            )

                            db.commit()

                            print(
                                "ATTENDANCE MARKED: "
                                f"student={best_student}, "
                                f"similarity={best_score:.3f}"
                            )

                        marked_students.add(
                            best_student
                        )

                # =========================================
                # UNKNOWN FACE
                # =========================================
                else:
                    label = (
                        f"Unknown | "
                        f"{best_score:.2f}"
                    )

                # =========================================
                # DRAW FACE BOX
                # =========================================
                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 255, 0),
                    2,
                )

                cv2.putText(
                    frame,
                    label,
                    (
                        x1,
                        max(y1 - 10, 20),
                    ),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 0),
                    2,
                )

            cv2.imshow(
                "Smart Attendance - Face Recognition",
                frame,
            )

            # Q = stop recognition
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    finally:
        camera.release()
        cv2.destroyAllWindows()
        db.close()

    print("===================================")
    print("RECOGNITION SESSION FINISHED")
    print("STUDENTS MARKED:", len(marked_students))
    print("===================================")


# =========================================================
# MAIN
# =========================================================
if __name__ == "__main__":

    if len(sys.argv) < 3:
        print(
            "Usage:\n"
            "  python -m app.services.ai.webcam_attendance "
            "enroll STUDENT_ID\n"
            "  python -m app.services.ai.webcam_attendance "
            "recognize SESSION_ID"
        )

        raise SystemExit(1)

    mode = sys.argv[1]
    value = int(sys.argv[2])

    if mode == "enroll":
        enroll(value)

    elif mode == "recognize":
        recognize(value)

    else:
        print("Unknown mode:", mode)
        raise SystemExit(1)