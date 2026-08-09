from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.models.user import User  # registers User model
from app.models.otp import OtpCode  # registers OtpCode model
from app.models.item import Item  # registers Item model
from app.auth.routes import router as auth_router
from app.marketplace.routes import router as marketplace_router

app = FastAPI(title="Sync-UVCE")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for dev/testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(marketplace_router, prefix="/marketplace", tags=["Marketplace"])

@app.get("/")
def root():
    return {"message": "Sync-UVCE API running"}