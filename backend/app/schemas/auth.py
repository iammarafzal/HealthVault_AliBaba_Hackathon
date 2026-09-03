# HealthVault AI — Auth Pydantic Schemas
# UserRegisterRequest (3-field fast onboarding), UserLogin, TokenResponse

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserResponse


class UserRegisterRequest(BaseModel):
    """Fast 3-field onboarding registration payload."""
    full_name: str = Field(..., min_length=1, examples=["Ahmad Raza"])
    email: EmailStr
    password: str = Field(..., min_length=6, examples=["Str0ngP@ss"])


class UserLogin(BaseModel):
    """Credentials for password-based authentication."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Returned on successful register / login."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
