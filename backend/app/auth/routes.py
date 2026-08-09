import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.otp import OtpCode
from app.auth.schemas import (
    UserRegister,
    OTPRequest,
    OTPVerify,
    Token,
    UserResponse,
    MessageResponse,
)
from app.auth.dependencies import get_current_user
from app.auth.utils import (
    send_otp_email,
    create_access_token,
    check_otp_request_rate_limit,
    check_verify_lockout,
    record_failed_verify_attempt,
    reset_verify_attempts,
)

router = APIRouter()

def make_aware(dt: Optional[datetime]) -> Optional[datetime]:
    """Helper to convert naive datetimes (e.g. from SQLite) to UTC timezone-aware datetimes."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new student account with name + email (no password).
    Creates a User record with is_verified=False.
    """
    email_clean = user_data.email.strip().lower()

    # Check for existing email registration
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )

    # Create new user without password
    new_user = User(
        name=user_data.name.strip(),
        email=email_clean,
        password_hash="",
        role=RoleEnum.student,
        is_verified=False,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully"}


@router.post("/request-otp", response_model=MessageResponse)
def request_otp(data: OTPRequest, db: Session = Depends(get_db)):
    """
    Generates a 6-digit numeric OTP for registered emails, invalidates previous codes,
    stores with a 5-minute expiry, and dispatches via SMTP or console log in dev mode.
    Rate-limited per email (max 3 requests per 10 minutes).
    """
    email_clean = data.email.strip().lower()

    # 1. Verify user exists
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No account found for this email. Please register first."
        )

    # 2. Check request rate-limit
    check_otp_request_rate_limit(email_clean)

    # 3. Generate 6-digit OTP code
    code = f"{secrets.randbelow(900000) + 100000}"

    # 4. Invalidate previous unused OTPs for this email
    db.query(OtpCode).filter(
        OtpCode.email == email_clean,
        OtpCode.is_used == False
    ).update({"is_used": True})

    # 5. Store new OTP code with 5-minute expiry
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    otp_record = OtpCode(
        email=email_clean,
        code=code,
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_record)
    db.commit()

    # 6. Send OTP via email (or dev console fallback)
    send_otp_email(email_clean, code)

    return {"message": "OTP sent successfully to your email"}


@router.post("/verify-otp", response_model=Token)
def verify_otp(data: OTPVerify, db: Session = Depends(get_db)):
    """
    Verifies OTP code for email.
    On success: marks OTP as used, sets User.is_verified=True, resets lockout counters, and returns JWT.
    On failure: records failed attempt (5 wrong attempts locks out email for 5 min) and returns error.
    """
    email_clean = data.email.strip().lower()
    code_clean = data.code.strip()

    # 1. Check if email is currently locked out
    check_verify_lockout(email_clean)

    # 2. Query matching user
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        record_failed_verify_attempt(email_clean)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code"
        )

    # 3. Query active, unused matching OTP
    otp_record = db.query(OtpCode).filter(
        OtpCode.email == email_clean,
        OtpCode.code == code_clean,
        OtpCode.is_used == False
    ).first()

    now = datetime.now(timezone.utc)
    expires_at_aware = make_aware(otp_record.expires_at) if otp_record else None

    if not otp_record or not expires_at_aware or expires_at_aware <= now:
        record_failed_verify_attempt(email_clean)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code"
        )

    # 4. Mark OTP as used
    otp_record.is_used = True

    # 5. Mark user verified on first successful verification
    if not user.is_verified:
        user.is_verified = True

    db.commit()

    # 6. Reset failed verification counters
    reset_verify_attempts(email_clean)

    # 7. Issue 24h JWT access token
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": role_str}
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Protected endpoint returning profile information for the authenticated user.
    """
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=role_str,
        is_verified=current_user.is_verified,
        created_at=make_aware(current_user.created_at)
    )
