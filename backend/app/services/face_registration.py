from __future__ import annotations

from datetime import datetime

import cv2
import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

from insightface.app import FaceAnalysis


# ============================================================
# FACE DUPLICATION THRESHOLD
# ============================================================
#
# A new enrollment is rejected when the captured face is
# sufficiently similar to ANY already enrolled student.
#
# 0.60 is intentionally stricter than the normal recognition
# threshold used by the attendance pipeline.
#
# This should later be calibrated using the university dataset.
#
FACE_DUPLICATE_THRESHOLD = 0.60


class FaceRegistrationService:
    """
    Handles student face enrollment.

    Flow:

    Student ID
        ↓
    Camera/Image
        ↓
    OpenCV
        ↓
    InsightFace
        ↓
    Single-face validation
        ↓
    Face Embedding
        ↓
    Compare against ALL enrolled faces
        ↓
    Duplicate biometric check
        ↓
    PostgreSQL
    """

    def __init__(self) -> None:
        self.model: FaceAnalysis | None = None

    # ========================================================
    # LOAD INSIGHTFACE MODEL
    # ========================================================

    def _get_model(self) -> FaceAnalysis:

        if self.model is None:

            self.model = FaceAnalysis(
                name="buffalo_l",
                providers=[
                    "CPUExecutionProvider"
                ],
            )

            self.model.prepare(
                ctx_id=0,
                det_size=(640, 640),
            )

        return self.model

    # ========================================================
    # DECODE IMAGE
    # ========================================================

    @staticmethod
    def _decode_image(
        image_bytes: bytes,
    ) -> np.ndarray:

        image_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8,
        )

        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR,
        )

        if image is None:
            raise ValueError(
                "Unable to read the uploaded image."
            )

        return image

    # ========================================================
    # CREATE FACE EMBEDDING
    # ========================================================

    def create_embedding(
        self,
        image_bytes: bytes,
    ) -> np.ndarray:

        image = self._decode_image(
            image_bytes
        )

        model = self._get_model()

        faces = model.get(image)

        # ----------------------------------------------------
        # NO FACE
        # ----------------------------------------------------

        if len(faces) == 0:

            raise ValueError(
                "No face detected. "
                "Please look directly at the camera."
            )

        # ----------------------------------------------------
        # MULTIPLE FACES
        # ----------------------------------------------------

        if len(faces) > 1:

            raise ValueError(
                "Multiple faces detected. "
                "Only one student may be visible "
                "during face registration."
            )

        # ----------------------------------------------------
        # SINGLE FACE
        # ----------------------------------------------------

        embedding = faces[0].embedding

        if embedding is None:

            raise ValueError(
                "Face embedding could not be generated."
            )

        embedding = np.asarray(
            embedding,
            dtype=np.float32,
        )

        norm = np.linalg.norm(
            embedding
        )

        if norm == 0:

            raise ValueError(
                "Invalid face embedding."
            )

        # Normalize
        embedding = embedding / norm

        return embedding

    # ========================================================
    # COSINE SIMILARITY
    # ========================================================

    @staticmethod
    def cosine_similarity(
        embedding_a: np.ndarray,
        embedding_b: np.ndarray,
    ) -> float:

        norm_a = np.linalg.norm(
            embedding_a
        )

        norm_b = np.linalg.norm(
            embedding_b
        )

        if norm_a == 0 or norm_b == 0:
            return 0.0

        a = embedding_a / norm_a
        b = embedding_b / norm_b

        return float(
            np.dot(a, b)
        )

    # ========================================================
    # CHECK WHETHER FACE ALREADY EXISTS
    # ========================================================

    def find_duplicate_face(
        self,
        db: Session,
        new_embedding: np.ndarray,
        current_student_id: int,
    ) -> dict | None:
        """
        Compare the newly captured face against every
        currently enrolled face.

        IMPORTANT:
        The comparison is based on biometric similarity,
        NOT student name, registration number or email.
        """

        rows = db.execute(
            text(
                """
                SELECT
                    fe.student_id,
                    fe.embedding,
                    s.first_name,
                    s.last_name,
                    s.registration_no
                FROM attendance.face_embeddings AS fe
                INNER JOIN academic.student AS s
                    ON s.student_id = fe.student_id
                WHERE fe.student_id <> :current_student_id
                """
            ),
            {
                "current_student_id": current_student_id,
            },
        ).mappings().all()

        if not rows:
            return None

        best_match = None
        best_similarity = -1.0

        # ----------------------------------------------------
        # COMPARE AGAINST EVERY REGISTERED FACE
        # ----------------------------------------------------

        for row in rows:

            stored_embedding = row["embedding"]

            if stored_embedding is None:
                continue

            try:

                # PostgreSQL BYTEA -> NumPy float32 vector
                existing_embedding = np.frombuffer(
                    stored_embedding,
                    dtype=np.float32,
                )

                if existing_embedding.size == 0:
                    continue

                similarity = self.cosine_similarity(
                    new_embedding,
                    existing_embedding,
                )

                if similarity > best_similarity:

                    best_similarity = similarity

                    best_match = {
                        "student_id": row["student_id"],
                        "first_name": row["first_name"],
                        "last_name": row["last_name"],
                        "registration_no": row[
                            "registration_no"
                        ],
                        "similarity": similarity,
                    }

            except Exception:
                # Ignore a corrupted individual embedding
                # rather than breaking the entire enrollment.
                continue

        # ----------------------------------------------------
        # DUPLICATE FOUND
        # ----------------------------------------------------

        if (
            best_match is not None
            and best_match["similarity"]
            >= FACE_DUPLICATE_THRESHOLD
        ):

            return best_match

        return None

    # ========================================================
    # ENROLL STUDENT
    # ========================================================

    def enroll_student(
        self,
        db: Session,
        student_id: int,
        image_bytes: bytes,
    ) -> dict:

        # ----------------------------------------------------
        # 1. VERIFY STUDENT EXISTS
        # ----------------------------------------------------

        student = db.execute(
            text(
                """
                SELECT
                    student_id,
                    first_name,
                    last_name,
                    registration_no
                FROM academic.student
                WHERE student_id = :student_id
                """
            ),
            {
                "student_id": student_id,
            },
        ).mappings().first()

        if student is None:

            raise ValueError(
                f"Student {student_id} does not exist."
            )

        # ----------------------------------------------------
        # 2. GENERATE FACE EMBEDDING
        # ----------------------------------------------------

        embedding = self.create_embedding(
            image_bytes
        )

        # ----------------------------------------------------
        # 3. BIOMETRIC DUPLICATE CHECK
        # ----------------------------------------------------
        #
        # THIS IS THE IMPORTANT SECURITY STEP.
        #
        # Before saving anything, compare this face against
        # every existing student's registered face.
        #

        duplicate = self.find_duplicate_face(
            db=db,
            new_embedding=embedding,
            current_student_id=student_id,
        )

        if duplicate is not None:

            duplicate_name = (
                f"{duplicate['first_name'] or ''} "
                f"{duplicate['last_name'] or ''}"
            ).strip()

            duplicate_registration = (
                duplicate["registration_no"]
                or "N/A"
            )

            similarity_percentage = round(
                duplicate["similarity"] * 100,
                2,
            )

            # ------------------------------------------------
            # VERY IMPORTANT:
            # DO NOT INSERT THE NEW EMBEDDING.
            # ------------------------------------------------

            raise ValueError(
                "FACE ALREADY REGISTERED. "
                f"This face is already associated with "
                f"student '{duplicate_name}' "
                f"(Registration No. "
                f"{duplicate_registration}). "
                f"Face similarity: "
                f"{similarity_percentage}%. "
                "The new face enrollment was rejected "
                "to protect student identity."
            )

        # ----------------------------------------------------
        # 4. CURRENT TIME
        # ----------------------------------------------------

        now = datetime.utcnow()

        # ----------------------------------------------------
        # 5. STORE EMBEDDING
        # ----------------------------------------------------

        db.execute(
            text(
                """
                INSERT INTO attendance.face_embeddings
                (
                    student_id,
                    embedding,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    :student_id,
                    :embedding,
                    :created_at,
                    :updated_at
                )
                """
            ),
            {
                "student_id": student["student_id"],
                "embedding": embedding.tobytes(),
                "created_at": now,
                "updated_at": now,
            },
        )

        # ----------------------------------------------------
        # 6. COMMIT
        # ----------------------------------------------------

        db.commit()

        # ----------------------------------------------------
        # 7. RESPONSE
        # ----------------------------------------------------

        student_name = (
            f"{student['first_name'] or ''} "
            f"{student['last_name'] or ''}"
        ).strip()

        return {
            "success": True,
            "student_id": student["student_id"],
            "student_name": student_name,
            "registration_no": student["registration_no"],
            "message": (
                "Face verified and enrolled successfully. "
                "The student is now ready for "
                "face recognition and attendance."
            ),
        }


# ============================================================
# SHARED SERVICE INSTANCE
# ============================================================

face_registration_service = FaceRegistrationService()