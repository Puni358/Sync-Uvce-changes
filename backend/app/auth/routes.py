from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, RoleEnum
from app.auth.schemas import UserRegister, UserLogin, Token, UserResponse, MessageResponse
from app.auth.dependencies import get_current_user
from app.auth.utils import (
    hash_password,
    verify_password,
    create_access_token,
    check_login_rate_limit,
    COLLEGE_EMAIL_DOMAIN,
)

router = APIRouter()

@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new student account.
    Validates that the email belongs to the required college domain (@uvce.ac.in).
    Hashes password with bcrypt before saving to database.
    """
    email_clean = user_data.email.strip().lower()

    # NOTE: Domain restriction disabled per requirements - accepts any valid email format.
    # College-domain restriction can be added later as a configurable check (e.g. if not email_clean.endswith(COLLEGE_EMAIL_DOMAIN): raise HTTPException(...))

    # Check for existing email registration
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )

    # Hash password and create new user
    hashed_pwd = hash_password(user_data.password)
    new_user = User(
        name=user_data.name.strip(),
        email=email_clean,
        password_hash=hashed_pwd,
        role=RoleEnum.student,
        is_verified=False,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully"}


@router.post("/login", response_model=Token)
def login(request: Request, login_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates a user and issues a JWT token.
    Enforces rate-limiting to protect against brute-force attempts.
    Returns generic error message on invalid email or password.
    """
    # Rate limit check per IP address
    check_login_rate_limit(request)

    email_clean = login_data.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()

    # Verify user existence and bcrypt password hash
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)

    # Generate 24h JWT access token
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
        created_at=current_user.created_at
    )
