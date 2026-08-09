from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.models.item import Item
from app.marketplace.schemas import ItemCreate, ItemResponse
from app.auth.dependencies import get_current_user

router = APIRouter()

def make_aware(dt: Optional[datetime]) -> Optional[datetime]:
    """Helper to convert naive datetimes (e.g. from SQLite) to UTC timezone-aware datetimes."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def check_and_update_expired_items(db: Session):
    """
    Background check that updates items to 'expired' status once expires_at has passed.
    Executed automatically on marketplace listing queries.
    """
    now = datetime.now(timezone.utc)
    # Check all active items and compare with make_aware
    active_items = db.query(Item).filter(Item.status == "available").all()
    for item in active_items:
        expires_at_aware = make_aware(item.expires_at)
        if expires_at_aware and expires_at_aware < now:
            item.status = "expired"
    db.commit()


def build_item_response(item: Item) -> ItemResponse:
    """Helper to convert Item ORM model to ItemResponse pydantic schema with seller_name."""
    seller_name = item.seller.name if item.seller else "UVCE Student"
    return ItemResponse(
        id=item.id,
        seller_id=item.seller_id,
        seller_name=seller_name,
        title=item.title,
        description=item.description,
        price=item.price,
        pricing_type=item.pricing_type,
        category=item.category,
        image_path=item.image_path,
        status=item.status,
        created_at=make_aware(item.created_at),
        expires_at=make_aware(item.expires_at),
    )


@router.post("/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    item_data: ItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a new marketplace listing (authenticated users only).
    Automatically sets seller_id, created_at, status='available', and expires_at = created_at + 7 days.
    """
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=7)

    new_item = Item(
        seller_id=current_user.id,
        title=item_data.title.strip(),
        description=item_data.description.strip() if item_data.description else None,
        price=item_data.price,
        pricing_type=item_data.pricing_type or "Fixed Price",
        category=item_data.category.strip().lower(),
        image_path=item_data.image_path,
        status="available",
        expires_at=expires_at,
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return build_item_response(new_item)


@router.get("/items", response_model=List[ItemResponse])
def list_items(
    category: Optional[str] = Query(None, description="Filter by category (books, calculator, equipment, notes, other)"),
    search: Optional[str] = Query(None, description="Search term matching title or description"),
    db: Session = Depends(get_db)
):
    """
    Lists all available, non-expired items.
    Executes background check to mark expired items before fetching results.
    Allows filtering by category and search query.
    """
    # 1. Update expired items
    check_and_update_expired_items(db)

    # 2. Query available items
    query = db.query(Item).filter(Item.status == "available")

    # 3. Apply category filter if specified
    if category and category.lower() != "all":
        query = query.filter(Item.category == category.strip().lower())

    # 4. Apply search filter if specified
    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Item.title.ilike(search_term),
                Item.description.ilike(search_term)
            )
        )

    # 5. Order by created_at descending
    items = query.order_by(Item.created_at.desc()).all()

    now = datetime.now(timezone.utc)
    available_items = [
        item for item in items
        if make_aware(item.expires_at) > now
    ]

    return [build_item_response(item) for item in available_items]


@router.get("/items/{item_id}", response_model=ItemResponse)
def get_item_detail(item_id: int, db: Session = Depends(get_db)):
    """
    Returns single item detail by ID.
    """
    check_and_update_expired_items(db)
    item = db.query(Item).filter(Item.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marketplace listing not found"
        )

    return build_item_response(item)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a marketplace listing. Owner-only check (seller_id == current_user.id).
    """
    item = db.query(Item).filter(Item.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marketplace listing not found"
        )

    if item.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this listing"
        )

    db.delete(item)
    db.commit()

    return None


@router.patch("/items/{item_id}/extend", response_model=ItemResponse)
def extend_item_expiry(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Extends expires_at by 5 more days from current expires_at.
    Owner-only. Only allowed if item hasn't already expired.
    """
    check_and_update_expired_items(db)
    item = db.query(Item).filter(Item.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marketplace listing not found"
        )

    if item.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to modify this listing"
        )

    now = datetime.now(timezone.utc)
    expires_at_aware = make_aware(item.expires_at)

    if item.status == "expired" or (expires_at_aware and expires_at_aware <= now):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot extend an expired listing"
        )

    # Extend expires_at by 5 days from existing expires_at (or now if expires_at < now)
    base_time = expires_at_aware if expires_at_aware > now else now
    item.expires_at = base_time + timedelta(days=5)

    db.commit()
    db.refresh(item)

    return build_item_response(item)
