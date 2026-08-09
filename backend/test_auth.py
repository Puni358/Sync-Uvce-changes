from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.auth.utils import _login_attempts

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

def test_register_and_login_flow():
    _login_attempts.clear()

    # 1. Invalid email format registration should fail (422)
    resp = client.post("/auth/register", json={
        "name": "Jane Doe",
        "email": "invalid-email-string",
        "password": "securepassword123"
    })
    assert resp.status_code == 422

    # 2. Valid email registration (any domain) should succeed (201)
    resp = client.post("/auth/register", json={
        "name": "Jane Doe",
        "email": "jane@example.com",
        "password": "securepassword123"
    })
    assert resp.status_code == 201
    assert resp.json()["message"] == "User registered successfully"

    # 2. Short password registration should fail (422)
    resp = client.post("/auth/register", json={
        "name": "Jane Doe",
        "email": "jane@uvce.ac.in",
        "password": "short"
    })
    assert resp.status_code == 422

    # 3. Valid student registration should succeed (201)
    resp = client.post("/auth/register", json={
        "name": "Jane Doe",
        "email": "jane@uvce.ac.in",
        "password": "securepassword123"
    })
    assert resp.status_code == 201
    assert resp.json()["message"] == "User registered successfully"

    # 3. Duplicate registration should fail (400)
    resp = client.post("/auth/register", json={
        "name": "Jane Doe",
        "email": "jane@example.com",
        "password": "securepassword123"
    })
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]

    # 4. Invalid login password should return generic 401
    resp = client.post("/auth/login", json={
        "email": "jane@example.com",
        "password": "wrongpassword"
    })
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid email or password"

    # 5. Invalid login email should return generic 401
    resp = client.post("/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "securepassword123"
    })
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid email or password"

    # 6. Valid login should return access token
    _login_attempts.clear()
    resp = client.post("/auth/login", json={
        "email": "jane@example.com",
        "password": "securepassword123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    token = data["access_token"]

    # 7. Unauthenticated GET /auth/me should return 401
    resp = client.get("/auth/me")
    assert resp.status_code == 401

    # 8. Authenticated GET /auth/me with valid Bearer token should return profile
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    me = resp.json()
    assert me["name"] == "Jane Doe"
    assert me["email"] == "jane@example.com"
    assert me["role"] == "student"
    assert me["is_verified"] is False

    print("\n[ALL BACKEND AUTH TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    test_register_and_login_flow()
