# Plano — Painel de Projetos

Traduz a spec em decisões técnicas concretas. Toda decisão aqui é verificada contra a constituição antes de virar tarefa.

## Arquitetura geral

```
[React SPA] <—— REST/JSON ——> [Django REST Framework] <——> [SQLite]
                                        |
                                        └──> [Serviço de IA] —— chamada HTTPS ——> [API Anthropic]
```

- Frontend e backend desacoplados: o React consome só a API REST, nunca acessa o banco diretamente.
- A chamada ao provedor de LLM acontece **somente no backend** (endpoint dedicado), conforme constituição — a chave de API nunca trafega até o frontend.

## Modelo de dados (Django ORM)

```python
class Project(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=280, blank=True)
    color = models.CharField(max_length=7, default="#7B5AA6")  # hex
    created_at = models.DateTimeField(auto_now_add=True)

class Task(models.Model):
    STATUS_CHOICES = [("todo", "A fazer"), ("doing", "Em andamento"), ("done", "Concluído")]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="todo")
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    source = models.CharField(max_length=10, choices=[("manual", "Manual"), ("ai", "IA")], default="manual")
```

- `source` existe para rastrear quais tarefas vieram de sugestão de IA (útil pro relato final e pra auditoria — decisão simples que não conflita com nenhum princípio da constituição).
- Exclusão de `Project` usa `on_delete=CASCADE` — implementa diretamente o comportamento de H2/casos extremos (exclusão em cascata), mas a confirmação em duas etapas ("tem N tarefas, excluir mesmo assim?") é responsabilidade do frontend, chamando um endpoint que primeiro retorna a contagem.

## Autenticação

- Django REST Framework + `djangorestframework-simplejwt` (token JWT). Justificativa da dependência nova: SPA React precisa de autenticação stateless simples sem depender de cookie de sessão cross-origin em dev.
- Todas as views usam `permission_classes = [IsAuthenticated]` por padrão (via `DEFAULT_PERMISSION_CLASSES` nas settings), exceto `/api/auth/login` e `/api/auth/register`.
- Querysets sempre filtrados por `owner=request.user` — nunca por `Project.objects.all()` sem filtro, para não vazar dado de outro usuário (constituição: segurança).

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cria usuário |
| POST | `/api/auth/login` | Retorna par de tokens JWT |
| GET/POST | `/api/projects/` | Lista / cria projetos do usuário logado |
| DELETE | `/api/projects/{id}/` | Exclui projeto (retorna contagem de tarefas antes se `?confirm=false`) |
| GET | `/api/tasks/` | Lista tarefas do usuário, com filtros `?status=`, `?project=` — usada na visão central (H2), já ordenada por prazo no backend |
| POST | `/api/tasks/` | Cria tarefa manual |
| PATCH | `/api/tasks/{id}/` | Edita tarefa (status, prazo, texto) — usado pelo drag-and-drop do kanban |
| DELETE | `/api/tasks/{id}/` | Exclui tarefa |
| POST | `/api/ai/breakdown/` | Recebe `{project_id, goal_text}`, chama o provedor de IA, retorna lista de subtarefas sugeridas (**não grava nada ainda**) |
| POST | `/api/ai/breakdown/confirm/` | Recebe a lista já editada pelo usuário e grava como `Task` com `source="ai"` |

A separação entre `breakdown` (sugestão) e `breakdown/confirm` (gravação) implementa diretamente o critério de H4 de que nada é salvo sem confirmação explícita.

## Serviço de IA (backend)

- Módulo isolado `ai_service.py`: monta um prompt com a meta do usuário e pede resposta em JSON estrito (lista de `{title, due_date | null}`).
- `try/except` em volta da chamada e do parse do JSON — qualquer falha vira um erro tratado (HTTP 502 com mensagem genérica pro frontend), nunca uma subtarefa inventada a partir de um parse malsucedido. Implementa o requisito de robustez da constituição/spec.
- Chave de API lida de variável de ambiente (`ANTHROPIC_API_KEY`), nunca hardcoded, nunca em `settings.py` versionado.

## Frontend (React)

- Roteamento: `/login`, `/` (visão central — H2), `/projects/:id` (kanban — H3).
- Componente `TaskBreakdownModal`: campo de texto livre pra meta → chama `/api/ai/breakdown/` → mostra lista editável (inputs de texto e data por item, botão de remover item) → botão "Adicionar ao projeto" chama `/api/ai/breakdown/confirm/`.
- Estado global simples via Context API (sem Redux — dependência desnecessária pro tamanho do projeto).
- Biblioteca de drag-and-drop para o kanban: `@hello-pangea/dnd` (fork mantido do antigo `react-beautiful-dnd`) — única dependência nova de UI, justificada por implementar H3 sem reescrever drag-and-drop na mão.

## Testes

- Backend: `pytest-django`. Cobertura mínima conforme constituição: criar/editar/excluir projeto e tarefa, e o fluxo de `breakdown` com a chamada de IA mockada (nunca bater na API real nos testes).
- Frontend: testes manuais guiados no relato final (não há exigência de cobertura automatizada de frontend na constituição atual).
