import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["JWT_SECRET"] = "test-secret-key-1234567890"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.main import app
from app.database import Base, get_db
from app.models.otp import OtpCode
from app.models.item import Item
from app.models.user import User

# Setup in-memory SQLite database for automated testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_full_auth_and_marketplace_flow():
    # 1. Register student
    resp = client.post("/auth/register", json={
        "name": "Test Student",
        "email": "student@uvce.ac.in"
    })
    assert resp.status_code == 201, resp.text
    assert resp.json()["message"] == "User registered successfully"

    # 2. Request OTP for unregistered email (should fail 400)
    resp = client.post("/auth/request-otp", json={"email": "nonexistent@uvce.ac.in"})
    assert resp.status_code == 400
    assert "No account found" in resp.json()["detail"]

    # 3. Request OTP for registered email (should succeed 200)
    resp = client.post("/auth/request-otp", json={"email": "student@uvce.ac.in"})
    assert resp.status_code == 200
    assert "OTP sent" in resp.json()["message"]

    # Retrieve generated OTP code directly from DB
    db = TestingSessionLocal()
    otp_record = db.query(OtpCode).filter(OtpCode.email == "student@uvce.ac.in").first()
    assert otp_record is not None
    valid_code = otp_record.code

    # 4. Verify invalid OTP code (should fail 400)
    resp = client.post("/auth/verify-otp", json={
        "email": "student@uvce.ac.in",
        "code": "000000"
    })
    assert resp.status_code == 400
    assert "Invalid or expired code" in resp.json()["detail"]

    # 5. Verify valid OTP code (should succeed 200 and return token)
    resp = client.post("/auth/verify-otp", json={
        "email": "student@uvce.ac.in",
        "code": valid_code
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    token = data["access_token"]
    db.close()

    # 6. Get user profile
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    profile = resp.json()
    assert profile["name"] == "Test Student"
    assert profile["is_verified"] is True

    # 7. Create Marketplace Item
    resp = client.post("/marketplace/items", json={
        "title": "B.S. Grewal Higher Engineering Math",
        "description": "3rd semester textbook in excellent condition",
        "price": 350.0,
        "pricing_type": "Fixed Price",
        "category": "books",
        "image_path": None
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201, resp.text
    item_data = resp.json()
    assert item_data["title"] == "B.S. Grewal Higher Engineering Math"
    assert item_data["seller_name"] == "Test Student"
    item_id = item_data["id"]

    # 8. List Marketplace Items
    resp = client.get("/marketplace/items?category=books")
    assert resp.status_code == 200
    items_list = resp.json()
    assert len(items_list) == 1
    assert items_list[0]["id"] == item_id

    # 9. Extend Item Expiry (Owner)
    resp = client.patch(f"/marketplace/items/{item_id}/extend", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200

    # 10. Delete Item (Owner)
    resp = client.delete(f"/marketplace/items/{item_id}", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 204

    # Verify item is deleted
    resp = client.get("/marketplace/items")
    assert resp.status_code == 200
    assert len(resp.json()) == 0

    print("\n[ALL AUTH AND MARKETPLACE INTEGRATION TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    test_full_auth_and_marketplace_flow()
