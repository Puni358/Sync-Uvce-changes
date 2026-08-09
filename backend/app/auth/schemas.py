from pydantic import BaseModel, Field, field_validator
import re
from datetime import datetime
from typing import Optional

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

def clean_email(v: str) -> str:
    v_clean = v.strip().lower()
    if not re.match(EMAIL_REGEX, v_clean):
        raise ValueError("Invalid email format")
    return v_clean

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name of the user")
    email: str = Field(..., description="Email address")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        return clean_email(v)

class OTPRequest(BaseModel):
    email: str = Field(..., description="Registered email address")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        return clean_email(v)

class OTPVerify(BaseModel):
    email: str = Field(..., description="Registered email address")
    code: str = Field(..., min_length=6, max_length=6, description="6-digit numeric OTP code")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        return clean_email(v)

    @field_validator("code")
    @classmethod
    def validate_code_format(cls, v: str) -> str:
        v_clean = v.strip()
        if not v_clean.isdigit() or len(v_clean) != 6:
            raise ValueError("OTP code must be exactly 6 numeric digits")
        return v_clean

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_verified: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    message: str
