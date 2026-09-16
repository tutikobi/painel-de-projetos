import logging

import pytest

from core.models import Project, Task

pytestmark = pytest.mark.django_db


def test_create_project_appears_in_list(auth_client, user):
    response = auth_client.post(
        "/api/projects/",
        {"name": "Cliente X", "description": "Site novo", "color": "#aabbcc"},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["color"] == "#AABBCC"
    assert response.data["task_count"] == 0
    assert Project.objects.get(pk=response.data["id"]).owner == user

    listed = auth_client.get("/api/projects/").data
    assert [p["id"] for p in listed] == [response.data["id"]]


def test_create_project_uses_default_color(auth_client):
    response = auth_client.post("/api/projects/", {"name": "Sem cor"}, format="json")

    assert response.status_code == 201
    assert response.data["color"] == "#7B5AA6"


@pytest.mark.parametrize(
    "payload",
    [
        {"name": ""},
        {"name": "   "},
        {"name": "Ok", "color": "roxo"},
        {"name": "x" * 121},
        {"name": "Ok", "description": "d" * 281},
    ],
)
def test_create_project_rejects_invalid_data(auth_client, payload):
    response = auth_client.post("/api/projects/", payload, format="json")

    assert response.status_code == 400
    assert Project.objects.count() == 0


def test_two_projects_can_share_the_same_name(auth_client):
    for _ in range(2):
        response = auth_client.post("/api/projects/", {"name": "TCC"}, format="json")
        assert response.status_code == 201

    assert Project.objects.filter(name="TCC").count() == 2


def test_list_only_returns_own_projects(auth_client, project, other_project):
    data = auth_client.get("/api/projects/").data

    assert [p["id"] for p in data] == [project.id]


def test_list_includes_task_count(auth_client, project):
    Task.objects.create(project=project, title="a")
    Task.objects.create(project=project, title="b")

    data = auth_client.get("/api/projects/").data

    assert data[0]["task_count"] == 2


def test_delete_without_confirmation_only_returns_task_count(auth_client, project):
    Task.objects.create(project=project, title="a")
    Task.objects.create(project=project, title="b")

    response = auth_client.delete(f"/api/projects/{project.id}/?confirm=false")

    assert response.status_code == 200
    assert response.data == {"task_count": 2}
    assert Project.objects.filter(pk=project.id).exists()
    assert Task.objects.count() == 2


def test_delete_confirmed_cascades_to_tasks(auth_client, project):
    Task.objects.create(project=project, title="a")

    response = auth_client.delete(f"/api/projects/{project.id}/")

    assert response.status_code == 204
    assert not Project.objects.filter(pk=project.id).exists()
    assert Task.objects.count() == 0


def test_cannot_delete_or_inspect_other_users_project(auth_client, other_project):
    Task.objects.create(project=other_project, title="segredo")

    count = auth_client.delete(f"/api/projects/{other_project.id}/?confirm=false")
    delete = auth_client.delete(f"/api/projects/{other_project.id}/")
    detail = auth_client.get(f"/api/projects/{other_project.id}/")

    assert count.status_code == 404
    assert delete.status_code == 404
    assert detail.status_code == 404
    assert Project.objects.filter(pk=other_project.id).exists()


def test_project_description_is_not_logged(auth_client, caplog):
    secret = "Contrato sigiloso com Empresa Fictícia SA"
    caplog.set_level(logging.DEBUG)

    auth_client.post(
        "/api/projects/", {"name": "Cliente", "description": secret}, format="json"
    )
    auth_client.post(
        "/api/projects/", {"name": "", "description": secret}, format="json"
    )

    assert secret not in caplog.text
