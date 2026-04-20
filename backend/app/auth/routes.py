from fastapi import APIRouter, Request

from app.auth.azure_auth import get_access_token, get_user_info  # noqa: F401

router = APIRouter()


@router.get("/me")
async def me(request: Request):
    """Return the current user derived from the Bearer token."""
    return get_user_info(request)
