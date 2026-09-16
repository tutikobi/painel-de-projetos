import logging

from django.db import transaction
from django.db.models import Count, F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, mixins, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import ai_service
from .models import Project, Task
from .serializers import (
    BreakdownConfirmSerializer,
    BreakdownRequestSerializer,
    ProjectSerializer,
    RegisterSerializer,
    TaskSerializer,
)

logger = logging.getLogger(__name__)

AI_ERROR_MESSAGE = (
    "Não foi possível gerar sugestões agora. Tente novamente em instantes "
    "ou crie as tarefas manualmente."
)
AI_NOT_CONFIGURED_CODE = "ai_not_configured"
AI_NOT_CONFIGURED_MESSAGE = (
    "Chave da API do Claude não cadastrada no servidor. Por isso não é "
    "possível executar esta ação de IA. As demais funções seguem disponíveis."
)
VALID_STATUSES = {choice for choice, _ in Task.STATUS_CHOICES}


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


class ProjectViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return (
            Project.objects.filter(owner=self.request.user)
            .annotate(task_count=Count("tasks"))
            .order_by("created_at", "id")
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        # Primeira etapa da confirmação: só informa quantas tarefas cairão junto.
        if request.query_params.get("confirm") == "false":
            return Response({"task_count": project.tasks.count()})
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        queryset = Task.objects.filter(project__owner=self.request.user).select_related(
            "project"
        )

        status_param = self.request.query_params.get("status")
        if status_param:
            statuses = [s.strip() for s in status_param.split(",") if s.strip()]
            if not statuses or not set(statuses) <= VALID_STATUSES:
                raise ValidationError({"status": "Use todo, doing e/ou done."})
            queryset = queryset.filter(status__in=statuses)

        project_param = self.request.query_params.get("project")
        if project_param:
            if not project_param.isdigit():
                raise ValidationError({"project": "Informe o id numérico do projeto."})
            queryset = queryset.filter(project_id=int(project_param))

        # Mais urgente primeiro; sem prazo por último; empate pela criação (spec H2).
        return queryset.order_by(F("due_date").asc(nulls_last=True), "created_at", "id")


class AIStatusView(APIView):
    """Informa só se a IA pode ser usada; nunca revela a chave."""

    def get(self, request):
        return Response({"configured": ai_service.is_configured()})


class BreakdownView(APIView):
    """Só sugere: nada é gravado aqui (spec H4)."""

    def post(self, request):
        serializer = BreakdownRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = get_object_or_404(
            Project, pk=serializer.validated_data["project_id"], owner=request.user
        )

        try:
            suggestions = ai_service.suggest_subtasks(
                serializer.validated_data["goal_text"], today=timezone.localdate()
            )
        except ai_service.AINotConfiguredError:
            return Response(
                {"detail": AI_NOT_CONFIGURED_MESSAGE, "code": AI_NOT_CONFIGURED_CODE},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except ai_service.AIServiceError:
            return Response(
                {"detail": AI_ERROR_MESSAGE}, status=status.HTTP_502_BAD_GATEWAY
            )

        logger.info("Sugestões de IA geradas: %d itens", len(suggestions))
        return Response(
            {
                "project_id": project.id,
                "suggestions": [
                    {
                        "title": s.title,
                        "due_date": s.due_date.isoformat() if s.due_date else None,
                    }
                    for s in suggestions
                ],
            }
        )


class BreakdownConfirmView(APIView):
    """Grava a lista revisada pelo usuário, marcando a origem como IA (spec H4)."""

    def post(self, request):
        serializer = BreakdownConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = get_object_or_404(
            Project, pk=serializer.validated_data["project_id"], owner=request.user
        )

        with transaction.atomic():
            created = [
                Task.objects.create(
                    project=project,
                    title=item["title"],
                    due_date=item["due_date"],
                    source=Task.SOURCE_AI,
                )
                for item in serializer.validated_data["tasks"]
            ]

        output = TaskSerializer(created, many=True, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)
