import cv2
import numpy as np
from insightface.app import FaceAnalysis


class FaceEngine:
    """
    Smart Attendance Face Recognition Engine.

    Uses a pretrained InsightFace model to:
    1. Detect faces
    2. Generate face embeddings
    3. Compare embeddings
    """

    def __init__(self):
        self.app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )

        self.app.prepare(
            ctx_id=0,
            det_size=(640, 640),
        )

    def detect(self, image: np.ndarray):
        """
        Detect faces in an OpenCV image.
        """
        return self.app.get(image)

    def embedding_from_image(self, image: np.ndarray):
        """
        Extract the best face embedding from an image.
        """

        faces = self.detect(image)

        if not faces:
            return None

        # Use the largest detected face.
        face = max(
            faces,
            key=lambda f: (f.bbox[2] - f.bbox[0])
            * (f.bbox[3] - f.bbox[1]),
        )

        embedding = face.normed_embedding

        return embedding.astype(np.float32)

    @staticmethod
    def similarity(
        embedding_a: np.ndarray,
        embedding_b: np.ndarray,
    ) -> float:
        """
        Cosine similarity between two normalized embeddings.
        """

        a = embedding_a / np.linalg.norm(embedding_a)
        b = embedding_b / np.linalg.norm(embedding_b)

        return float(np.dot(a, b))

    @staticmethod
    def is_match(
        similarity: float,
        threshold: float = 0.45,
    ) -> bool:
        """
        Determine whether two faces belong to the same person.

        Threshold can later be tuned using your university dataset.
        """

        return similarity >= threshold


face_engine = FaceEngine()