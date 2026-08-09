from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta, timezone
from app.database import Base

def default_expires_at():
    return datetime.now(timezone.utc) + timedelta(days=7)

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    pricing_type = Column(String, default="Fixed Price", nullable=False)
    category = Column(String, nullable=False, index=True)
    image_path = Column(Text, nullable=True)
    status = Column(String, default="available", nullable=False, index=True)  # available, sold, expired
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), default=default_expires_at, nullable=False)

    seller = relationship("User", backref="items")
