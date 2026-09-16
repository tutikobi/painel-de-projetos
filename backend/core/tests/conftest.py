from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from core import ai_service
from core.models import Project

PASSWORD = "Senha-forte-123"


@pytest.fixture(autouse=True)
def fast_password_hasher(settings):
    # O PBKDF2 padrão é lento de propósito; nos testes basta um hash rápido.
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user("ana", password=PASSWORD)


@pytest.fixture
def other_user(db):
    return get_user_model().objects.create_user("bruno", password=PASSWORD)


@pytest.fixture
def anon_client():
    return APIClient()


@pytest.fixture
def client_for():
    def make(user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    return make


@pytest.fixture
def auth_client(client_for, user):
    return client_for(user)


@pytest.fixture
def project(user):
    return Project.objects.create(owner=user, name="TCC", color="#123ABC")


@pytest.fixture
def other_project(other_user):
    return Project.objects.create(owner=other_user, name="Projeto do Bruno")


class FakeMessages:
    """Substitui client.beta.messages: nenhum teste chama a API real."""

    def __init__(self):
        self.calls = []
        self.text = '{"subtasks": []}'
        self.stop_reason = "end_turn"
        self.error = None

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if self.error is not None:
            raise self.error
        return SimpleNamespace(
            stop_reason=self.stop_reason,
            content=[SimpleNamespace(type="text", text=self.text)],
        )


@pytest.fixture
def fake_ai(monkeypatch):
    messages = FakeMessages()
    client = SimpleNamespace(beta=SimpleNamespace(messages=messages))
    monkeypatch.setattr(ai_service, "_get_client", lambda: client)
    return messages
