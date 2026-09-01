from typing import Generic, TypeVar

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase


ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class ServiceBase(
    Generic[ModelType, CreateSchemaType, UpdateSchemaType]
):
    """
    Base service layer.

    Responsibilities:
    - Hold the database session.
    - Hold the domain CRUD object.
    - Provide a clean boundary between API and CRUD.
    - Keep business logic in domain-specific services.
    """

    def __init__(
        self,
        db: Session,
        crud: CRUDBase,
    ) -> None:
        self.db = db
        self.crud = crud
