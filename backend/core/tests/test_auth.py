import pytest
from django.contrib.auth import get_user_model

from .conftest import PASSWORD

pytestmark = pytest.mark.django_db


def test_register_creates_user_with_hashed_password(anon_client):
    response = anon_client.post(
        "/api/auth/register/",
        {"username": "carla", "password": PASSWORD},
        format="json",
    )

    assert response.status_code == 201
    assert "password" not in response.data
    user = get_user_model().objects.get(username="carla")
    assert user.password != PASSWORD
    assert user.check_password(PASSWORD)


def test_register_rejects_duplicate_username(anon_client, user):
    response = anon_client.post(
        "/api/auth/register/",
        {"username": user.username, "password": PASSWORD},
        format="json",
    )

    assert response.status_code == 400
    assert "username" in response.data


def test_register_rejects_weak_password(anon_client):
    response = anon_client.post(
        "/api/auth/register/",
        {"username": "carla", "password": "123"},
        format="json",
    )

    assert response.status_code == 400
    assert "password" in response.data


def test_login_returns_tokens_that_authenticate_requests(anon_client, user):
    response = anon_client.post(
        "/api/auth/login/",
        {"username": user.username, "password": PASSWORD},
        format="json",
    )

    assert response.status_code == 200
    assert {"access", "refresh"} <= set(response.data)

    anon_client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    assert anon_client.get("/api/projects/").status_code == 200


def test_login_with_wrong_password_returns_401(anon_client, user):
    response = anon_client.post(
        "/api/auth/login/",
        {"username": user.username, "password": "errada"},
        format="json",
    )

    assert response.status_code == 401


def test_refresh_returns_new_access_token(anon_client, user):
    tokens = anon_client.post(
        "/api/auth/login/",
        {"username": user.username, "password": PASSWORD},
        format="json",
    ).data

    response = anon_client.post(
        "/api/auth/refresh/", {"refresh": tokens["refresh"]}, format="json"
    )

    assert response.status_code == 200
    assert "access" in response.data


def test_invalid_bearer_token_returns_401(anon_client):
    anon_client.credentials(HTTP_AUTHORIZATION="Bearer token-invalido")

    assert anon_client.get("/api/tasks/").status_code == 401


@pytest.mark.parametrize(
    "method, url",
    [
        ("get", "/api/projects/"),
        ("post", "/api/projects/"),
        ("delete", "/api/projects/1/"),
        ("get", "/api/tasks/"),
        ("post", "/api/tasks/"),
        ("patch", "/api/tasks/1/"),
        ("delete", "/api/tasks/1/"),
        ("get", "/api/ai/status/"),
        ("post", "/api/ai/breakdown/"),
        ("post", "/api/ai/breakdown/confirm/"),
    ],
)
def test_every_data_route_requires_authentication(anon_client, method, url):
    response = getattr(anon_client, method)(url, {}, format="json")

    assert response.status_code == 401
