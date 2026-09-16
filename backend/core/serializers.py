import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers

from .models import Project, Task

User = get_user_model()

HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = ["id", "username", "password"]

    def validate(self, attrs):
        try:
            validate_password(attrs["password"], User(username=attrs["username"]))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        # create_user aplica o hashing padrão do Django (constituição: senhas).
        return User.objects.create_user(**validated_data)


class ProjectSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ["id", "name", "description", "color", "created_at", "task_count"]
        read_only_fields = ["id", "created_at", "task_count"]

    def get_task_count(self, obj):
        annotated = getattr(obj, "task_count", None)
        return annotated if annotated is not None else obj.tasks.count()

    def validate_color(self, value):
        if not HEX_COLOR_RE.match(value):
            raise serializers.ValidationError("Use uma cor hexadecimal, ex.: #7B5AA6.")
        return value.upper()


class TaskSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.none())
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_color = serializers.CharField(source="project.color", read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "project_name",
            "project_color",
            "title",
            "status",
            "due_date",
            "created_at",
            "source",
            "is_overdue",
        ]
        read_only_fields = ["id", "created_at", "source"]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        # Só projetos do próprio usuário são aceitos ao criar ou mover tarefa (H5, H6).
        if request is not None and request.user.is_authenticated:
            fields["project"].queryset = Project.objects.filter(owner=request.user)
        return fields

    def get_is_overdue(self, obj):
        return (
            obj.due_date is not None
            and obj.status != Task.STATUS_DONE
            and obj.due_date < timezone.localdate()
        )


class BreakdownRequestSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    # CharField corta espaços e rejeita vazio: meta em branco nunca chega à IA.
    goal_text = serializers.CharField(max_length=1000)


class SuggestedTaskSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    due_date = serializers.DateField(allow_null=True, required=False, default=None)


class BreakdownConfirmSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    tasks = SuggestedTaskSerializer(many=True, allow_empty=False, max_length=50)
