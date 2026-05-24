import hashlib
import secrets
from dataclasses import dataclass

from fastapi import Request, Response

from app.config import Settings, get_settings


@dataclass(frozen=True)
class ClientSession:
    token: str
    token_hash: str
    is_new: bool


def session_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def read_or_create_session(
    request: Request,
    settings: Settings | None = None,
) -> ClientSession:
    settings = settings or get_settings()
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        return ClientSession(token=token, token_hash=session_hash(token), is_new=False)

    token = secrets.token_urlsafe(32)
    return ClientSession(token=token, token_hash=session_hash(token), is_new=True)


def apply_session_cookie(
    response: Response,
    session: ClientSession,
    settings: Settings | None = None,
) -> None:
    if not session.is_new:
        return

    settings = settings or get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session.token,
        max_age=int(settings.session_ttl_hours * 60 * 60),
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )
