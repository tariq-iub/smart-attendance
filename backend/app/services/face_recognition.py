from __future__ import annotations

from typing import Any

import cv2
import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

from insightface.app import FaceAnalysis


class FaceRecognitionService:

    # ============================================================
    # CONFIGURATION
    # ============================================================

    RECOGNITION_THRESHOLD = 0.45

    def __init__(self) -> None:
        self.model: FaceAnalysis | None = None

    # ============================================================
    # LOAD INSIGHTFACE MODEL
    # ============================================================

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

    # ============================================================
    # DECODE IMAGE
    # ============================================================

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
                "Unable to decode the uploaded image."
            )

        return image

    # ============================================================
    # COSINE SIMILARITY
    # ============================================================

    @staticmethod
    def _cosine_similarity(
        first: np.ndarray,
        second: np.ndarray,
    ) -> float:

        first_norm = np.linalg.norm(first)
        second_norm = np.linalg.norm(second)

        if first_norm == 0 or second_norm == 0:
            return 0.0

        return float(
            np.dot(first, second)
            / (first_norm * second_norm)
        )

    # ============================================================
    # CREATE EMBEDDINGS FOR ALL DETECTED FACES
    # ============================================================

    def _create_embeddings(
        self,
        image_bytes: bytes,
    ) -> list[np.ndarray]:

        image = self._decode_image(
            image_bytes
        )

        model = self._get_model()

        faces = model.get(image)

        if not faces:
            raise ValueError(
                "No face detected. "
                "Please make sure the students' faces "
                "are clearly visible."
            )

        embeddings: list[np.ndarray] = []

        for face in faces:

            embedding = face.embedding

            if embedding is None:
                continue

            embedding = np.asarray(
                embedding,
                dtype=np.float32,
            )

            norm = np.linalg.norm(
                embedding
            )

            if norm == 0:
                continue

            embeddings.append(
                embedding / norm
            )

        if not embeddings:
            raise ValueError(
                "Faces were detected, but valid "
                "face embeddings could not be generated."
            )

        return embeddings

    # ============================================================
    # LOAD ENROLLED FACES
    #
    # If section_student_ids is supplied, recognition is restricted
    # to students enrolled in THAT section.
    # ============================================================

    def _load_enrolled_faces(
        self,
        db: Session,
        section_student_ids: set[int] | None = None,
    ):

        query = """
            SELECT
                fe.face_embedding_id,
                fe.student_id,
                fe.embedding,
                s.first_name,
                s.last_name,
                s.registration_no
            FROM attendance.face_embeddings fe
            INNER JOIN academic.student s
                ON s.student_id = fe.student_id
            WHERE s.is_active = TRUE
        """

        parameters: dict[str, Any] = {}

        # --------------------------------------------------------
        # SECTION ROSTER RESTRICTION
        # --------------------------------------------------------

        if section_student_ids is not None:

            if not section_student_ids:
                return []

            query += """
                AND fe.student_id = ANY(
                    CAST(:section_student_ids AS INTEGER[])
                )
            """

            parameters[
                "section_student_ids"
            ] = list(section_student_ids)

        rows = db.execute(
            text(query),
            parameters,
        ).mappings().all()

        return rows

    # ============================================================
    # RECOGNIZE MULTIPLE FACES
    # ============================================================

    def recognize(
        self,
        db: Session,
        image_bytes: bytes,
        section_student_ids: set[int] | None = None,
    ) -> dict[str, Any]:

        # --------------------------------------------------------
        # 1. DETECT ALL FACES
        # --------------------------------------------------------

        query_embeddings = self._create_embeddings(
            image_bytes
        )

        # --------------------------------------------------------
        # 2. LOAD ENROLLED STUDENTS
        # --------------------------------------------------------

        enrolled_rows = self._load_enrolled_faces(
            db=db,
            section_student_ids=section_student_ids,
        )

        if not enrolled_rows:

            if section_student_ids is not None:

                raise ValueError(
                    "No enrolled faces were found for "
                    "students in this section."
                )

            raise ValueError(
                "No enrolled student faces found. "
                "Enroll student faces first."
            )

        recognized_students: list[
            dict[str, Any]
        ] = []

        unknown_faces = 0

        # --------------------------------------------------------
        # 3. RECOGNIZE EACH DETECTED FACE
        # --------------------------------------------------------

        for query_embedding in query_embeddings:

            best_student = None
            best_score = -1.0

            for row in enrolled_rows:

                stored_embedding = np.frombuffer(
                    row["embedding"],
                    dtype=np.float32,
                )

                if stored_embedding.size == 0:
                    continue

                score = self._cosine_similarity(
                    query_embedding,
                    stored_embedding,
                )

                if score > best_score:

                    best_score = score
                    best_student = row

            # ----------------------------------------------------
            # 4. UNKNOWN FACE
            # ----------------------------------------------------

            if (
                best_student is None
                or best_score
                < self.RECOGNITION_THRESHOLD
            ):

                unknown_faces += 1

                continue

            # ----------------------------------------------------
            # 5. STUDENT INFORMATION
            # ----------------------------------------------------

            first_name = (
                best_student["first_name"]
                or ""
            )

            last_name = (
                best_student["last_name"]
                or ""
            )

            student_name = (
                f"{first_name} {last_name}"
            ).strip()

            recognized_students.append(
                {
                    "student_id": (
                        best_student["student_id"]
                    ),
                    "student_name": student_name,
                    "registration_no": (
                        best_student[
                            "registration_no"
                        ]
                    ),
                    "confidence": round(
                        best_score * 100,
                        2,
                    ),
                    "similarity": round(
                        best_score,
                        4,
                    ),
                    "threshold": (
                        self.RECOGNITION_THRESHOLD
                    ),
                }
            )

        # --------------------------------------------------------
        # 6. REMOVE DUPLICATE STUDENT MATCHES
        #
        # One student appearing more than once in the classroom
        # image must produce only one recognition result.
        # --------------------------------------------------------

        unique_students: dict[
            int,
            dict[str, Any]
        ] = {}

        for student in recognized_students:

            student_id = student[
                "student_id"
            ]

            existing = unique_students.get(
                student_id
            )

            if (
                existing is None
                or student["similarity"]
                > existing["similarity"]
            ):

                unique_students[
                    student_id
                ] = student

        final_students = list(
            unique_students.values()
        )

        # --------------------------------------------------------
        # 7. RETURN RESULT
        # --------------------------------------------------------

        return {
            "recognized_students":
                final_students,

            "recognized_count":
                len(final_students),

            "unknown_count":
                unknown_faces,

            "detected_face_count":
                len(query_embeddings),
        }


# ============================================================
# SINGLE SHARED SERVICE INSTANCE
# ============================================================

face_recognition_service = (
    FaceRecognitionService()
)