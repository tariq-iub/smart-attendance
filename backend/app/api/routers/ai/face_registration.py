from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import cv2
import numpy as np
import json

from app.api.dependencies import get_db
from app.services.ai.face_engine import face_engine
from sqlalchemy import text


router = APIRouter(
    prefix="/face-registration",
    tags=["AI - Face Registration"],
)


@router.post("/{student_id}")
async def register_face(
    student_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    image_bytes = await file.read()

    image_array = np.frombuffer(
        image_bytes,
        dtype=np.uint8,
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR,
    )

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid image.",
        )

    # Verify student exists
    student = db.execute(
        text(
            """
            SELECT student_id
            FROM academic.student
            WHERE student_id = :student_id
            """
        ),
        {"student_id": student_id},
    ).first()

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student not found.",
        )

    # Generate embedding
    embedding = face_engine.embedding_from_image(image)

    if embedding is None:
        raise HTTPException(
            status_code=400,
            detail="No face detected. Please provide a clear face image.",
        )

    embedding = np.asarray(
        embedding,
        dtype=np.float32,
    )

    norm = np.linalg.norm(embedding)

    if norm == 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid face embedding.",
        )

    embedding = embedding / norm

    embedding_json = json.dumps(
        embedding.tolist()
    )

    # Deactivate previous embedding
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

    # Save new embedding
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
                'InsightFace-ArcFace',
                'buffalo_l',
                TRUE,
                NOW(),
                NOW()
            )
            """
        ),
        {
            "student_id": student_id,
            "embedding_vector": embedding_json,
        },
    )

    db.commit()

    return {
        "success": True,
        "student_id": student_id,
        "message": "Face registered successfully.",
    }