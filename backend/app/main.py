from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.applications import router as applications_router
from app.api.auth import router as auth_router
from app.api.companies import router as companies_router
from app.api.match import router as match_router
from app.api.statuses import router as statuses_router
from app.core.config import settings

app = FastAPI(title="Job Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(applications_router)
app.include_router(companies_router)
app.include_router(match_router)
app.include_router(statuses_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
