import json
import logging
from datetime import date

import anthropic
import httpx2
import pytest

from core import ai_service
from core.models import Project, Task
from core.views import AI_ERROR_MESSAGE

pytestmark = pytest.mark.django_db

GOAL = "Escrever capítulo 3 do TCC para a Empresa Fictícia SA até dia 20"


def valid_payload(*items):
    return json.dumps({"subtasks": list(items)})


# ---------- /api/ai/breakdown/ ----------


def test_breakdown_returns_suggestions_without_saving(auth_client, project, fake_ai):
    fake_ai.text = valid_payload(
        {"title": "Levantar referências", "due_date": "2030-01-10"},
        {"title": "Escrever rascunho", "due_date": None},
    )

    response = auth_client.post(
        "/api/ai/breakdown/",
        {"project_id": project.id, "goal_text": GOAL},
        format="json",
    )

    assert response.status_code == 200
    assert response.data == {
        "project_id": project.id,
        "suggestions": [
            {"title": "Levantar referências", "due_date": "2030-01-10"},
            {"title": "Escrever rascunho", "due_date": None},
        ],
    }
    assert Task.objects.count() == 0


def test_breakdown_sends_goal_and_today_to_the_model(auth_client, user, fake_ai):
    project_with_details = Project.objects.create(
        owner=user, name="Cliente Sigiloso", description="Contato: joana@cliente.com"
    )
    fake_ai.text = valid_payload({"title": "a", "due_date": None})

    auth_client.post(
        "/api/ai/breakdown/",
        {"project_id": project_with_details.id, "goal_text": f"  {GOAL}  "},
        format="json",
    )

    (call,) = fake_ai.calls
    content = call["messages"][0]["content"]
    assert f"<meta>\n{GOAL}\n</meta>" in content
    assert "Data de hoje:" in content
    assert call["output_config"]["format"]["type"] == "json_schema"
    # O nome/descrição do projeto não é enviado ao provedor.
    sent = json.dumps(call, ensure_ascii=False, default=str)
    assert project_with_details.name not in sent
    assert project_with_details.description not in sent


@pytest.mark.parametrize("goal", ["", "   ", "\n\t"])
def test_blank_goal_is_rejected_before_calling_ai(auth_client, project, fake_ai, goal):
    response = auth_client.post(
        "/api/ai/breakdown/",
        {"project_id": project.id, "goal_text": goal},
        format="json",
    )

    assert response.status_code == 400
    assert fake_ai.calls == []


def test_goal_too_long_is_rejected_before_calling_ai(auth_client, project, fake_ai):
    response = auth_client.post(
        "/api/ai/breakdown/",
        {"project_id": project.id, "goal_text": "x" * 1001},
        format="json",
    )

    assert response.status_code == 400
    assert fake_ai.calls == []


def test_breakdown_for_other_users_project_returns_404(
    auth_client, other_project, fake_ai
):
    response = auth_client.post(
        "/api/ai/breakdown/",
        {"project_id": other_project.id, "goal_text": GOAL},
        format="json",
    )

    assert response.status_code == 404
    assert fake_ai.calls == []


@pytest.mark.parametrize(
    "raw",
    [
        "isto não é json",
        "[]",
        '{"subtasks": []}',
        '{"subtasks": "texto"}',
        '{"tarefas": [{"title": "a", "due_date": null}]}',
        '{"subtasks": [{"title": "a"}]}',
        '{"subtasks": [{"title": "", "due_date": null}]}',
        '{"subtasks": [{"title": "a", "due_date": "20/01/2030"}]}',
        '{"subtasks": [{"title": "a", "due_date": "2030-02-30"}]}',
        '{"subtasks": [{"title": "a", "due_date": null, "extra": 1}]}',
    ],
)
def test_malformed_ai_response_becomes_502_and_saves_nothing(
    auth_client, project, fake_ai, raw, caplog
):
    fake_ai.text = raw
    caplog.set_level(logging.DEBUG)

    response = auth_client.post(
        "/api/ai/breakdown/",
        {"project_id": project.id, "goal_text": GOAL},
        format="json",
    )

    assert response.status_code == 502
    assert response.data == {"detail": AI_ERROR_MESSAGE}
    assert Task.objects.count() == 0
    assert GOAL not in caplog.text


@pytest.mark.parametrize(
    "error",
    [
        anthropic.APIConnectionError(
            request=httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
        ),
        anthropic.APITimeoutError(
            request=httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
        ),
    ],
)
def test_network_failure_becomes_502(auth_client, project, fake_ai, error, caplog):
    fake_ai.error = error
    caplog.set_level(logging.DEBUG)

    response = auth_client.post(
        "/api/ai/breakdown/",
        {"project_id": project.id, "goal_text": GOAL},
        format="json",
    )

    assert response.status_code == 502
    assert GOAL not in caplog.text


@pytest.mark.parametrize("stop_reason", ["refusal", "max_tokens"])
def test_unusable_stop_reason_becomes_502(auth_client, project, fake_ai, stop_reason):
    fake_ai.stop_reason = stop_reason
    fake_ai.text = valid_payload({"title": "a", "due_date": None})

    response = auth_client.post(
        "/api/ai/breakdown/",
        {"project_id": project.id, "goal_text": GOAL},
        format="json",
    )

    assert response.status_code == 502


@pytest.mark.parametrize("key", [None, "", "   "])
def test_missing_api_key_returns_specific_warning(
    auth_client, project, monkeypatch, key, caplog
):
    # Usa o _get_client real: nenhuma requisição sai sem a chave.
    if key is None:
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    else:
        monkeypatch.setenv("ANTHROPIC_API_KEY", key)
    caplog.set_level(logging.DEBUG)

    response = auth_client.post(
        "/api/ai/breakdown/",
        {"project_id": project.id, "goal_text": GOAL},
        format="json",
    )

    assert response.status_code == 503
    assert response.data["code"] == "ai_not_configured"
    assert "Chave da API do Claude não cadastrada" in response.data["detail"]
    assert Task.objects.count() == 0
    assert GOAL not in caplog.text


def test_blank_goal_is_rejected_even_without_api_key(auth_client, project, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    response = auth_client.post(
        "/api/ai/breakdown/",
        {"project_id": project.id, "goal_text": "  "},
        format="json",
    )

    assert response.status_code == 400


# ---------- /api/ai/status/ ----------


@pytest.mark.parametrize(
    "key, configured", [("sk-ant-teste", True), ("", False), (None, False)]
)
def test_ai_status_reports_only_whether_key_exists(
    auth_client, monkeypatch, key, configured
):
    if key is None:
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    else:
        monkeypatch.setenv("ANTHROPIC_API_KEY", key)

    response = auth_client.get("/api/ai/status/")

    assert response.status_code == 200
    assert response.data == {"configured": configured}
    if key:
        assert key not in response.content.decode()


def test_manual_task_creation_still_works_after_ai_failure(
    auth_client, project, fake_ai
):
    fake_ai.text = "lixo"
    auth_client.post(
        "/api/ai/breakdown/",
        {"project_id": project.id, "goal_text": GOAL},
        format="json",
    )

    response = auth_client.post(
        "/api/tasks/", {"project": project.id, "title": "Na mão"}, format="json"
    )

    assert response.status_code == 201


# ---------- /api/ai/breakdown/confirm/ ----------


def test_confirm_saves_edited_tasks_as_ai_source(auth_client, project):
    response = auth_client.post(
        "/api/ai/breakdown/confirm/",
        {
            "project_id": project.id,
            "tasks": [
                {"title": "Levantar referências (editado)", "due_date": "2030-01-10"},
                {"title": "Escrever rascunho", "due_date": None},
                {"title": "Revisar"},
            ],
        },
        format="json",
    )

    assert response.status_code == 201
    assert [t["source"] for t in response.data] == ["ai", "ai", "ai"]
    saved = Task.objects.order_by("id")
    assert [(t.title, t.due_date, t.status) for t in saved] == [
        ("Levantar referências (editado)", date(2030, 1, 10), "todo"),
        ("Escrever rascunho", None, "todo"),
        ("Revisar", None, "todo"),
    ]


@pytest.mark.parametrize(
    "tasks",
    [
        [],
        [{"title": ""}],
        [{"title": "ok"}, {"title": "x" * 201}],
        [{"title": "ok", "due_date": "não é data"}],
        [{"title": "ok"}] * 51,
    ],
)
def test_confirm_rejects_invalid_list_atomically(auth_client, project, tasks):
    response = auth_client.post(
        "/api/ai/breakdown/confirm/",
        {"project_id": project.id, "tasks": tasks},
        format="json",
    )

    assert response.status_code == 400
    assert Task.objects.count() == 0


def test_confirm_into_other_users_project_returns_404(auth_client, other_project):
    response = auth_client.post(
        "/api/ai/breakdown/confirm/",
        {"project_id": other_project.id, "tasks": [{"title": "invasão"}]},
        format="json",
    )

    assert response.status_code == 404
    assert Task.objects.count() == 0


# ---------- ai_service.parse_subtasks ----------


def test_parse_strips_titles_and_parses_dates():
    result = ai_service.parse_subtasks(
        valid_payload(
            {"title": "  Ler artigos  ", "due_date": "2030-03-01"},
            {"title": "Escrever", "due_date": None},
        )
    )

    assert result == [
        ai_service.SuggestedTask("Ler artigos", date(2030, 3, 1)),
        ai_service.SuggestedTask("Escrever", None),
    ]


def test_parse_rejects_too_many_suggestions():
    items = [{"title": f"t{i}", "due_date": None} for i in range(21)]

    with pytest.raises(ai_service.AIServiceError):
        ai_service.parse_subtasks(valid_payload(*items))
