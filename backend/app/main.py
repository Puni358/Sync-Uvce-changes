from fastapi import FastAPI
from app.database import Base, engine
from app.models.user import User  # registers the model with Base

app = FastAPI(title="Sync-UVCE")

Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Sync-UVCE API running"}