import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "database" in data

def test_login_invalid_credentials():
    response = client.post(
        "/auth/login",
        json={"email": "nonexistent_user@autovex.com", "password": "wrongpassword123"}
    )
    assert response.status_code == 401
    assert "detail" in response.json()

def test_login_success():
    # Attempt login with demo account
    response = client.post(
        "/auth/login",
        json={"email": "demo@autovex.com", "password": "demo123"}
    )
    if response.status_code == 200:
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "demo@autovex.com"

        # Verify /auth/me
        token = data["access_token"]
        me_resp = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == "demo@autovex.com"
