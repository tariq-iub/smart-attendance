from app.api.routers.auth.login_audit import router as login_audit_router
from app.api.routers.auth.permission import router as permission_router
from app.api.routers.auth.role import router as role_router
from app.api.routers.auth.role_permission import router as role_permission_router
from app.api.routers.auth.user_account import router as user_account_router
from app.api.routers.auth.user_role import router as user_role_router

__all__ = [
    "user_account_router",
    "role_router",
    "permission_router",
    "user_role_router",
    "role_permission_router",
    "login_audit_router",
]
