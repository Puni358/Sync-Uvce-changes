from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class ItemCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200, description="Item title")
    description: Optional[str] = Field(None, max_length=2000, description="Detailed item description")
    price: float = Field(..., gt=0, description="Price in INR")
    pricing_type: Optional[str] = Field("Fixed Price", description="Fixed Price or Negotiable")
    category: str = Field(..., description="Category (books, calculator, equipment, notes, other)")
    image_path: Optional[str] = Field(None, description="Image URL or SVG data URI")

class ItemResponse(BaseModel):
    id: int
    seller_id: int
    seller_name: str
    title: str
    description: Optional[str] = None
    price: float
    pricing_type: str
    category: str
    image_path: Optional[str] = None
    status: str
    created_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True
