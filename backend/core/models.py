from django.conf import settings
from django.db import models


class Project(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="projects"
    )
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=280, blank=True)
    color = models.CharField(max_length=7, default="#7B5AA6")  # hex
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Project #{self.pk}"


class Task(models.Model):
    STATUS_TODO = "todo"
    STATUS_DOING = "doing"
    STATUS_DONE = "done"
    STATUS_CHOICES = [
        (STATUS_TODO, "A fazer"),
        (STATUS_DOING, "Em andamento"),
        (STATUS_DONE, "Concluído"),
    ]
    SOURCE_MANUAL = "manual"
    SOURCE_AI = "ai"
    SOURCE_CHOICES = [(SOURCE_MANUAL, "Manual"), (SOURCE_AI, "IA")]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=STATUS_TODO
    )
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    source = models.CharField(
        max_length=10, choices=SOURCE_CHOICES, default=SOURCE_MANUAL
    )

    def __str__(self):
        # Sem título: __str__ pode acabar em logs/tracebacks (spec: NFR dados sensíveis).
        return f"Task #{self.pk}"
