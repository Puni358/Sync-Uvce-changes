import os
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List
from collections import defaultdict
import bcrypt
from jose import jwt, JWTError
from fastapi import HTTPException, Request, status

# Security and Auth Config
JWT_SECRET = os.getenv("JWT_SECRET", "default_sync_uvce_jwt_secret_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
COLLEGE_EMAIL_DOMAIN = os.getenv("COLLEGE_EMAIL_DOMAIN", "@uvce.ac.in").lower()

def hash_password(password: str) -> str:
    """Hashes plain text password using bcrypt (truncating at 72 bytes as per bcrypt spec)."""
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against hashed password."""
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a signed JWT access token valid for 24 hours."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and verifies a JWT token. Returns payload dict or None if invalid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

# Simple In-Memory Rate Limiter for Login Attempts (per client IP)
_login_attempts: Dict[str, List[float]] = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
RATE_LIMIT_WINDOW_SECONDS = 60

def check_login_rate_limit(request: Request):
    """Enforces rate limiting on login endpoint to prevent brute-force attacks."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()

    # Clean up expired timestamps
    valid_timestamps = [ts for ts in _login_attempts[client_ip] if now - ts < RATE_LIMIT_WINDOW_SECONDS]
    _login_attempts[client_ip] = valid_timestamps

    if len(valid_timestamps) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again in a minute."
        )

    _login_attempts[client_ip].append(now)
