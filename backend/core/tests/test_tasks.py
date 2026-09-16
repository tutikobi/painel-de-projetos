from datetime import timedelta

import pytest
from django.utils import timezone

from core.models import Project, Task

pytestmark = pytest.mark.django_db


def test_create_task_manually(auth_client, project):
    response = auth_client.post(
        "/api/tasks/",
        {"project": project.id, "title": "Revisar texto", "due_date": "2030-01-10"},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["status"] == "todo"
    assert response.data["source"] == "manual"
    assert response.data["project_name"] == "TCC"
    assert response.data["project_color"] == "#123ABC"
    assert response.data["is_overdue"] is False


def test_create_task_ignores_client_supplied_source(auth_client, project):
    response = auth_client.post(
        "/api/tasks/",
        {"project": project.id, "title": "x", "source": "ai"},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["source"] == "manual"


def test_create_task_with_past_due_date_is_allowed_and_flagged(auth_client, project):
    yesterday = timezone.localdate() - timedelta(days=1)

    response = auth_client.post(
        "/api/tasks/",
        {"project": project.id, "title": "Retroativa", "due_date": str(yesterday)},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["is_overdue"] is True


@pytest.mark.parametrize(
    "payload",
    [
        {"title": "sem projeto"},
        {"title": "", "project": "PROJECT"},
        {"title": "status inválido", "project": "PROJECT", "status": "later"},
        {"title": "data inválida", "project": "PROJECT", "due_date": "amanhã"},
    ],
)
def test_create_task_rejects_invalid_data(auth_client, project, payload):
    payload = {k: project.id if v == "PROJECT" else v for k, v in payload.items()}

    response = auth_client.post("/api/tasks/", payload, format="json")

    assert response.status_code == 400
    assert Task.objects.count() == 0


def test_cannot_create_task_in_other_users_project(auth_client, other_project):
    response = auth_client.post(
        "/api/tasks/", {"project": other_project.id, "title": "invasão"}, format="json"
    )

    assert response.status_code == 400
    assert Task.objects.count() == 0


def test_list_orders_by_due_date_with_nulls_last_and_ties_by_creation(
    auth_client, project, user
):
    second_project = Project.objects.create(owner=user, name="Freela")
    today = timezone.localdate()
    no_date = Task.objects.create(project=project, title="sem prazo")
    later = Task.objects.create(project=project, title="depois", due_date=today)
    tie_old = Task.objects.create(
        project=second_project, title="empate antigo", due_date=today
    )
    urgent = Task.objects.create(
        project=second_project, title="atrasada", due_date=today - timedelta(days=3)
    )
    # Força a ordem de criação para o critério de desempate.
    base = timezone.now()
    Task.objects.filter(pk=later.pk).update(created_at=base - timedelta(hours=2))
    Task.objects.filter(pk=tie_old.pk).update(created_at=base - timedelta(hours=1))

    data = auth_client.get("/api/tasks/").data

    assert [t["id"] for t in data] == [urgent.id, later.id, tie_old.id, no_date.id]
    assert data[0]["is_overdue"] is True


def test_list_only_returns_own_tasks(auth_client, project, other_project):
    mine = Task.objects.create(project=project, title="minha")
    Task.objects.create(project=other_project, title="do outro")

    data = auth_client.get("/api/tasks/").data

    assert [t["id"] for t in data] == [mine.id]


def test_filter_by_multiple_statuses_for_pending_view(auth_client, project):
    todo = Task.objects.create(project=project, title="a", status="todo")
    doing = Task.objects.create(project=project, title="b", status="doing")
    Task.objects.create(project=project, title="c", status="done")

    data = auth_client.get("/api/tasks/?status=todo,doing").data

    assert {t["id"] for t in data} == {todo.id, doing.id}


def test_filter_by_project(auth_client, project, user):
    other_mine = Project.objects.create(owner=user, name="Outro")
    task = Task.objects.create(project=project, title="a")
    Task.objects.create(project=other_mine, title="b")

    data = auth_client.get(f"/api/tasks/?project={project.id}").data

    assert [t["id"] for t in data] == [task.id]


def test_filter_by_other_users_project_returns_nothing(auth_client, other_project):
    Task.objects.create(project=other_project, title="segredo")

    data = auth_client.get(f"/api/tasks/?project={other_project.id}").data

    assert data == []


@pytest.mark.parametrize("query", ["status=later", "status=todo,xyz", "project=abc"])
def test_invalid_filters_return_400(auth_client, query):
    assert auth_client.get(f"/api/tasks/?{query}").status_code == 400


def test_patch_status_moves_task_between_columns(auth_client, project):
    task = Task.objects.create(project=project, title="a")

    response = auth_client.patch(
        f"/api/tasks/{task.id}/", {"status": "doing"}, format="json"
    )

    assert response.status_code == 200
    task.refresh_from_db()
    assert task.status == "doing"


def test_done_task_leaves_pending_view_but_stays_in_project(auth_client, project):
    task = Task.objects.create(project=project, title="a")

    auth_client.patch(f"/api/tasks/{task.id}/", {"status": "done"}, format="json")

    pending = auth_client.get("/api/tasks/?status=todo,doing").data
    board = auth_client.get(f"/api/tasks/?project={project.id}").data
    assert pending == []
    assert [(t["id"], t["status"]) for t in board] == [(task.id, "done")]


def test_done_overdue_task_is_not_flagged(auth_client, project):
    task = Task.objects.create(
        project=project,
        title="a",
        status="done",
        due_date=timezone.localdate() - timedelta(days=5),
    )

    data = auth_client.get(f"/api/tasks/{task.id}/").data

    assert data["is_overdue"] is False


def test_patch_edits_title_due_date_and_project(auth_client, project, user):
    destination = Project.objects.create(owner=user, name="Destino")
    task = Task.objects.create(project=project, title="antigo")

    response = auth_client.patch(
        f"/api/tasks/{task.id}/",
        {"title": "novo", "due_date": "2031-05-01", "project": destination.id},
        format="json",
    )

    assert response.status_code == 200
    task.refresh_from_db()
    assert (task.title, str(task.due_date), task.project_id) == (
        "novo",
        "2031-05-01",
        destination.id,
    )


def test_patch_can_clear_due_date(auth_client, project):
    task = Task.objects.create(
        project=project, title="a", due_date=timezone.localdate()
    )

    response = auth_client.patch(
        f"/api/tasks/{task.id}/", {"due_date": None}, format="json"
    )

    assert response.status_code == 200
    task.refresh_from_db()
    assert task.due_date is None


def test_patch_rejects_invalid_status(auth_client, project):
    task = Task.objects.create(project=project, title="a")

    response = auth_client.patch(
        f"/api/tasks/{task.id}/", {"status": "archived"}, format="json"
    )

    assert response.status_code == 400
    task.refresh_from_db()
    assert task.status == "todo"


def test_cannot_move_task_into_other_users_project(auth_client, project, other_project):
    task = Task.objects.create(project=project, title="a")

    response = auth_client.patch(
        f"/api/tasks/{task.id}/", {"project": other_project.id}, format="json"
    )

    assert response.status_code == 400
    task.refresh_from_db()
    assert task.project_id == project.id


def test_cannot_read_edit_or_delete_other_users_task(auth_client, other_project):
    task = Task.objects.create(project=other_project, title="segredo")

    assert auth_client.get(f"/api/tasks/{task.id}/").status_code == 404
    assert (
        auth_client.patch(
            f"/api/tasks/{task.id}/", {"status": "done"}, format="json"
        ).status_code
        == 404
    )
    assert auth_client.delete(f"/api/tasks/{task.id}/").status_code == 404
    task.refresh_from_db()
    assert task.status == "todo"


def test_put_is_not_allowed(auth_client, project):
    task = Task.objects.create(project=project, title="a")

    response = auth_client.put(
        f"/api/tasks/{task.id}/", {"project": project.id, "title": "b"}, format="json"
    )

    assert response.status_code == 405


def test_delete_task(auth_client, project):
    task = Task.objects.create(project=project, title="a")

    response = auth_client.delete(f"/api/tasks/{task.id}/")

    assert response.status_code == 204
    assert not Task.objects.filter(pk=task.id).exists()


def test_delete_missing_task_returns_404(auth_client):
    assert auth_client.delete("/api/tasks/999/").status_code == 404
