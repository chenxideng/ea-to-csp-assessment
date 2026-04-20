"""Azure auth helpers — extract Bearer tokens from frontend MSAL.js SSO."""

import base64
import json

from fastapi import Request, HTTPException


def get_access_token(request: Request) -> str:
    """Extract the Bearer access token from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return auth_header[7:]


def get_token_claims(request: Request) -> dict:
    """Decode JWT payload claims from the access token (without verification).

    We do NOT verify the signature here because the token is immediately
    forwarded to Azure Resource Manager which does its own validation.
    The claims are used only for display / report metadata.
    """
    token = get_access_token(request)
    try:
        payload = token.split(".")[1]
        payload += "=" * (4 - len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload))
    except Exception:
        return {}


def get_user_info(request: Request) -> dict:
    """Return user info dict extracted from the JWT claims."""
    claims = get_token_claims(request)
    return {
        "name": claims.get("name", ""),
        "email": claims.get(
            "unique_name",
            claims.get("upn", claims.get("preferred_username", "")),
        ),
        "tenant_id": claims.get("tid", ""),
        "object_id": claims.get("oid", ""),
    }
    return None
