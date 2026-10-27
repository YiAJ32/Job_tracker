from fastapi import FastAPI, HTTPException, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware

from app.api.applications import router as applications_router
from app.api.auth import router as auth_router
from app.api.companies import router as companies_router
from app.api.match import router as match_router
from app.api.profile import router as profile_router
from app.api.statuses import router as statuses_router
from app.api.users import router as users_router
from app.core.config import settings
from app.core.i18n import preferred_language, translate_message

app = FastAPI(title="Job Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Los errores se devuelven en el idioma que pidió el frontend
@app.exception_handler(HTTPException)
async def translated_http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, str):
        language = preferred_language(request.headers.get("accept-language"))
        exc = HTTPException(
            status_code=exc.status_code,
            detail=translate_message(exc.detail, language),
            headers=exc.headers,
        )
    return await http_exception_handler(request, exc)


app.include_router(auth_router)
app.include_router(applications_router)
app.include_router(companies_router)
app.include_router(match_router)
app.include_router(profile_router)
app.include_router(statuses_router)
app.include_router(users_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
