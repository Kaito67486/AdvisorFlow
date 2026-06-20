from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from database import get_db
from models import Advisor
from security import decode_access_token


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_advisor(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme,
    ),
    access_token: str | None = Cookie(default=None),
    database: Session = Depends(get_db),
) -> Advisor:
    token = None

    if credentials is not None:
        token = credentials.credentials
    elif access_token:
        token = access_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
        )

    try:
        payload = decode_access_token(token)
        advisor_id = int(payload["sub"])
    except (
        InvalidTokenError,
        KeyError,
        TypeError,
        ValueError,
    ) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The authentication token is invalid.",
        ) from error

    advisor = database.get(Advisor, advisor_id)

    if advisor is None or not advisor.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The advisor account is unavailable.",
        )

    return advisor