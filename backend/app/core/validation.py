from urllib.parse import urlsplit

from fastapi import HTTPException

MAX_URL_LENGTH = 500


def clean_url(value: str | None) -> str | None:
    """Deja solo enlaces http(s); sin esquema se asume https (ej. "empresa.com")."""
    value = (value or "").strip()
    if not value:
        return None
    if "://" not in value and not value.lower().startswith(("javascript:", "data:", "vbscript:")):
        value = f"https://{value}"
    parts = urlsplit(value)
    # Bloquea javascript:, data: y similares, que ejecutan código al hacer clic
    if parts.scheme.lower() not in ("http", "https") or not parts.netloc or len(value) > MAX_URL_LENGTH:
        raise HTTPException(
            status_code=422, detail="El enlace tiene que ser una dirección web (http o https)"
        )
    return value


def require_text(value: str | None, detail: str) -> str:
    value = (value or "").strip()
    if not value:
        raise HTTPException(status_code=422, detail=detail)
    return value
