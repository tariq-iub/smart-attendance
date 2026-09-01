from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.router import api_router
from app.database.connection import engine


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Smart Attendance System API",
    description="Backend API for Smart Attendance System",
    version="1.0.0",
)


# ============================================================
# CORS — React Frontend
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost:5173",
        "https://127.0.0.1:5173",
        "https://192.168.0.103:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ============================================================
# DATABASE CONNECTION CHECK
# ============================================================

@app.on_event("startup")
def test_database_connection():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        print("✅ PostgreSQL Database Connected Successfully")

    except Exception as e:
        print("❌ Database Connection Failed")
        print(e)


# ============================================================
# API ROUTER REGISTRATION
# ============================================================

app.include_router(api_router)


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Welcome to Smart Attendance System API"
    }