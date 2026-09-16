from django.urls import path
from rest_framework.routers import SimpleRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    BreakdownConfirmView,
    BreakdownView,
    ProjectViewSet,
    RegisterView,
    TaskViewSet,
)

router = SimpleRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("tasks", TaskViewSet, basename="task")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("ai/breakdown/", BreakdownView.as_view(), name="ai-breakdown"),
    path(
        "ai/breakdown/confirm/",
        BreakdownConfirmView.as_view(),
        name="ai-breakdown-confirm",
    ),
    *router.urls,
]
