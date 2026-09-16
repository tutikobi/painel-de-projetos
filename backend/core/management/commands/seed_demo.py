"""Cria um usuário de demonstração com projetos e tarefas de exemplo.

Uso (só em desenvolvimento):
    python manage.py seed_demo
    python manage.py seed_demo --username demo --password Outra-senha-123

Rodar de novo apaga e recria os dados desse usuário. Outros usuários não
são alterados. Os prazos são calculados a partir de hoje, então sempre
existe uma tarefa atrasada, uma próxima e uma sem prazo.
"""

from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from core.models import Project, Task

DEFAULT_USERNAME = "demo"
DEFAULT_PASSWORD = "Painel-demo-2026"

# (nome, descrição, cor, [(título, dias a partir de hoje ou None, status, origem)])
DEMO_PROJECTS = [
    (
        "TCC — Mestrado",
        "Dissertação sobre visão computacional",
        "#6A4C96",
        [
            ("Revisar bibliografia do capítulo 2", -3, "todo", "manual"),
            ("Escrever seção de metodologia", 4, "doing", "manual"),
            ("Levantar artigos recentes sobre o tema", 1, "todo", "ai"),
            ("Montar rascunho do capítulo 3", 6, "todo", "ai"),
            ("Enviar capítulo 1 para o orientador", -10, "done", "manual"),
            ("Separar ideias para trabalhos futuros", None, "todo", "manual"),
        ],
    ),
    (
        "Site da Padaria Pão Quente",
        "Freela: site institucional com cardápio",
        "#D9822B",
        [
            ("Aprovar layout da página inicial", -1, "todo", "manual"),
            ("Implementar página de cardápio", 8, "doing", "manual"),
            ("Configurar domínio e hospedagem", 15, "todo", "manual"),
            ("Coletar fotos dos produtos", None, "todo", "manual"),
        ],
    ),
    (
        "Artigo para congresso",
        "Submissão até o fim do mês",
        "#2B7A78",
        [
            ("Definir estrutura do artigo", 2, "todo", "manual"),
            ("Rodar experimentos finais", 9, "todo", "manual"),
        ],
    ),
]


class Command(BaseCommand):
    help = "Cria (ou recria) um usuário de demonstração com dados de exemplo."

    def add_arguments(self, parser):
        parser.add_argument("--username", default=DEFAULT_USERNAME)
        parser.add_argument("--password", default=DEFAULT_PASSWORD)

    @transaction.atomic
    def handle(self, *args, username, password, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo é só para desenvolvimento (DJANGO_DEBUG=1).")

        User = get_user_model()
        user, created = User.objects.get_or_create(username=username)
        user.set_password(password)
        user.save()
        Project.objects.filter(owner=user).delete()

        today = timezone.localdate()
        task_count = 0
        for name, description, color, tasks in DEMO_PROJECTS:
            project = Project.objects.create(
                owner=user, name=name, description=description, color=color
            )
            for title, days, status, source in tasks:
                Task.objects.create(
                    project=project,
                    title=title,
                    due_date=None if days is None else today + timedelta(days=days),
                    status=status,
                    source=source,
                )
                task_count += 1

        action = "criado" if created else "recriado"
        self.stdout.write(
            self.style.SUCCESS(
                f"Usuário '{username}' {action} com {len(DEMO_PROJECTS)} projetos "
                f"e {task_count} tarefas. Senha: {password}"
            )
        )
