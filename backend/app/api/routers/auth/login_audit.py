from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.schemas.auth.login_audit import (
    LoginAuditCreate,
    LoginAuditRead,
)
from app.services.auth.login_audit import LoginAuditService

router = APIRouter(
    prefix="/login-audits",
    tags=["Auth - Login Audit"],
)


@router.get("/", response_model=list[LoginAuditRead])
def list_audits(db: Session = Depends(get_db)):
    return LoginAuditService(db).list_audits()


@router.get(
    "/{login_audit_id}",
    response_model=LoginAuditRead,
)
def get_audit(
    login_audit_id: int,
    db: Session = Depends(get_db),
):
    audit = LoginAuditService(db).get_audit(login_audit_id)

    if audit is None:
        raise HTTPException(
            status_code=404,
            detail="Login audit not found",
        )

    return audit


@router.post(
    "/",
    response_model=LoginAuditRead,
    status_code=status.HTTP_201_CREATED,
)
def record_login(
    data: LoginAuditCreate,
    db: Session = Depends(get_db),
):
    return LoginAuditService(db).record_login(data)
