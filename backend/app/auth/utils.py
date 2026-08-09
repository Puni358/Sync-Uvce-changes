import os
import time
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List
from collections import defaultdict
from jose import jwt, JWTError
from fastapi import HTTPException, status

logger = logging.getLogger("uvicorn.error")

# Security and Auth Config
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is not set. Refusing to start.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
COLLEGE_EMAIL_DOMAIN = os.getenv("COLLEGE_EMAIL_DOMAIN", "@uvce.ac.in").lower()

# SMTP Configuration
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def is_smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)

if is_smtp_configured():
    logger.info("[AUTH] SMTP email sending is configured and ACTIVE.")
else:
    logger.info("[AUTH] [DEV MODE] SMTP credentials missing. OTP codes will be printed to server log/console.")

def send_otp_email(email: str, code: str):
    """
    Sends OTP to user email via SMTP if configured, or prints to log/console in dev mode.
    """
    if is_smtp_configured():
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Your Sync-UVCE Login Code: {code}"
            msg["From"] = SMTP_USER
            msg["To"] = email

            text = f"Your Sync-UVCE verification code is: {code}\n\nThis code will expire in 5 minutes."
            html = f"""
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
              <h2 style="color: #2563eb;">Sync-UVCE Verification Code</h2>
              <p>Your one-time login passcode is:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb; margin: 20px 0;">
                {code}
              </div>
              <p style="color: #64748b; font-size: 14px;">This code expires in 5 minutes. Do not share it with anyone.</p>
            </div>
            """

            msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, [email], msg.as_string())
            logger.info(f"[AUTH] OTP email sent successfully to {email}")
        except Exception as e:
            logger.error(f"[AUTH] Failed to send SMTP email to {email}: {e}")
            # Fallback to dev log on SMTP failure so user isn't locked out in dev
            logger.info(f"[DEV MODE] OTP for {email}: {code}")
    else:
        logger.info(f"[DEV MODE] OTP for {email}: {code}")
        print(f"\n==========================================")
        print(f"[DEV MODE] OTP for {email}: {code}")
        print(f"==========================================\n")

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

# --- In-Memory Rate Limiting for OTP Requests (max 3 per 10 minutes per email) ---
_otp_requests: Dict[str, List[float]] = defaultdict(list)
MAX_OTP_REQUESTS_PER_WINDOW = 3
OTP_REQUEST_WINDOW_SECONDS = 600  # 10 minutes

def check_otp_request_rate_limit(email: str):
    """Enforces rate limiting on OTP requests per email."""
    email_clean = email.strip().lower()
    now = time.time()
    valid_ts = [ts for ts in _otp_requests[email_clean] if now - ts < OTP_REQUEST_WINDOW_SECONDS]
    _otp_requests[email_clean] = valid_ts

    if len(valid_ts) >= MAX_OTP_REQUESTS_PER_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests for this email. Please wait 10 minutes before requesting again."
        )

    _otp_requests[email_clean].append(now)

# --- In-Memory Lockout Tracker for Failed Verify Attempts (5 wrong attempts -> 5 min lockout) ---
_verify_failed_attempts: Dict[str, List[float]] = defaultdict(list)
_verify_lockouts: Dict[str, float] = {}
MAX_VERIFY_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 300  # 5 minutes

def check_verify_lockout(email: str):
    """Checks if email is currently locked out from verification attempts."""
    email_clean = email.strip().lower()
    now = time.time()

    lockout_until = _verify_lockouts.get(email_clean)
    if lockout_until:
        if now < lockout_until:
            remaining_mins = int((lockout_until - now) // 60) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed verification attempts. Email locked out for {remaining_mins} more minute(s)."
            )
        else:
            del _verify_lockouts[email_clean]
            _verify_failed_attempts[email_clean] = []

def record_failed_verify_attempt(email: str):
    """Records a failed verification attempt and locks out email if threshold reached."""
    email_clean = email.strip().lower()
    now = time.time()

    # Keep timestamps within lockout duration window
    valid_ts = [ts for ts in _verify_failed_attempts[email_clean] if now - ts < LOCKOUT_DURATION_SECONDS]
    valid_ts.append(now)
    _verify_failed_attempts[email_clean] = valid_ts

    if len(valid_ts) >= MAX_VERIFY_ATTEMPTS:
        _verify_lockouts[email_clean] = now + LOCKOUT_DURATION_SECONDS
        _verify_failed_attempts[email_clean] = []
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Account locked out for 5 minutes."
        )

def reset_verify_attempts(email: str):
    """Resets failed verification attempt counters on successful OTP verification."""
    email_clean = email.strip().lower()
    _verify_failed_attempts.pop(email_clean, None)
    _verify_lockouts.pop(email_clean, None)
