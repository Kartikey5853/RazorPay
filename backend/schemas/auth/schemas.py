from pydantic import BaseModel, EmailStr, Field
class RegisterRequest(BaseModel): name: str; email: EmailStr; password: str = Field(min_length=8); business_name: str = ""; timezone: str = "UTC"
class LoginRequest(BaseModel): email: EmailStr; password: str
class TokenResponse(BaseModel): access_token: str; token_type: str = "bearer"; user: dict
