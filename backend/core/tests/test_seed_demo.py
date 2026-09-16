from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.utils import timezone

from core.models import Project, Task

pytestmark = pytest.mark.django_db


def run_seed(**options):
    out = StringIO()
    call_command("seed_demo", stdout=out, **options)
    return out.getvalue()


def test_seed_creates_demo_user_with_login_ready_data(settings, anon_client):
    settings.DEBUG = True

    output = run_seed()

    user = get_user_model().objects.get(username="demo")
    assert user.check_password("Painel-demo-2026")
    assert Project.objects.filter(owner=user).count() == 3
    assert Task.objects.filter(project__owner=user).count() == 12
    assert "Senha: Painel-demo-2026" in output
    login = anon_client.post(
        "/api/auth/login/",
        {"username": "demo", "password": "Painel-demo-2026"},
        format="json",
    )
    assert login.status_code == 200


def test_seed_covers_every_section_of_the_central_view(settings):
    settings.DEBUG = True
    run_seed()
    tasks = Task.objects.filter(project__owner__username="demo")
    today = timezone.localdate()

    pending = tasks.exclude(status="done")
    assert pending.filter(due_date__lt=today).exists()
    assert pending.filter(due_date__gte=today).exists()
    assert pending.filter(due_date__isnull=True).exists()
    assert tasks.filter(status="doing").exists()
    assert tasks.filter(status="done").exists()
    assert tasks.filter(source="ai").exists()


def test_seed_is_repeatable_and_keeps_other_users(settings, other_project):
    settings.DEBUG = True

    run_seed()
    run_seed(password="Outra-senha-456")

    demo = get_user_model().objects.get(username="demo")
    assert demo.check_password("Outra-senha-456")
    assert Project.objects.filter(owner=demo).count() == 3
    assert Project.objects.filter(pk=other_project.pk).exists()


def test_seed_refuses_to_run_outside_debug(settings):
    settings.DEBUG = False

    with pytest.raises(CommandError):
        run_seed()

    assert not get_user_model().objects.filter(username="demo").exists()
