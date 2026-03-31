"""JWT authentication middleware for the Bank Offering AI API."""

import os
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_AUDIENCE: str = os.environ.get("JWT_AUDIENCE", "bank-offering-api")
JWT_ISSUER: str = os.environ.get("JWT_ISSUER", "bank-auth-service")

bearer_scheme = HTTPBearer(auto_error=True)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token, returning the claims payload."""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    customer_id: Optional[str] = payload.get("customer_id")
    if not customer_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required customer_id claim",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


async def get_current_customer_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Backward-compatible dependency: returns customer_id from JWT."""
    payload = decode_token(credentials.credentials)
    return payload["customer_id"]


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Returns {user_id, role, display_name} from JWT. Role defaults to 'customer'."""
    payload = decode_token(credentials.credentials)
    return {
        "user_id": payload["customer_id"],
        "role": payload.get("role", "customer"),
        "display_name": payload.get("display_name", payload["customer_id"]),
    }


async def require_employee(
    user: dict = Depends(get_current_user),
) -> dict:
    """Allow employees and admins only."""
    if user["role"] not in ("employee", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Employee or admin access required")
    return user


async def require_admin(
    user: dict = Depends(get_current_user),
) -> dict:
    """Allow admins only."""
    if user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Admin access required")
    return user
