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
- Exclusão de `Project` usa `on_delete=CASCADE` — implementa diretamente o comportamento dos casos extremos da spec (exclusão em cascata), mas a confirmação em duas etapas ("tem N tarefas, excluir mesmo assim?") é responsabilidade do frontend, chamando um endpoint que primeiro retorna a contagem.

## Autenticação

- Django REST Framework + `djangorestframework-simplejwt` (token JWT). Justificativa da dependência nova: SPA React precisa de autenticação stateless simples sem depender de cookie de sessão cross-origin em dev. *(Com o proxy do Vite, adotado depois, não há mais cross-origin em desenvolvimento. O JWT foi mantido porque deixa a API sem estado e sem necessidade de proteção CSRF.)*
- Todas as views usam `permission_classes = [IsAuthenticated]` por padrão (via `DEFAULT_PERMISSION_CLASSES` nas settings), exceto `/api/auth/login/`, `/api/auth/register/` e `/api/auth/refresh/` (emenda da constituição).
- `DEFAULT_AUTHENTICATION_CLASSES` contém **só** `JWTAuthentication`. Com autenticação por sessão ligada, o DRF responderia 403 em vez do 401 exigido pela H6.
- Tokens: acesso de 30 min, refresh de 1 dia. No frontend os dois ficam **só em memória** (nada de `localStorage`), porque a constituição proíbe token em texto plano "em lugar nenhum". Recarregar a página exige novo login.
- Em desenvolvimento o Vite faz proxy de `/api` para o Django: SPA e API ficam na mesma origem, e o CORS citado na T1.1 deixou de ser necessário (uma dependência a menos: `django-cors-headers`).
- Querysets sempre filtrados pelo usuário logado (`owner=request.user` em projetos, `project__owner=request.user` em tarefas) — nunca por `Project.objects.all()` sem filtro, para não vazar dado de outro usuário (constituição: segurança).

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register/` | Cria usuário (validadores de senha padrão do Django) |
| POST | `/api/auth/login/` | Retorna par de tokens JWT |
| POST | `/api/auth/refresh/` | Troca um refresh token válido por novo token de acesso |
| GET/POST | `/api/projects/` | Lista / cria projetos do usuário logado; cada projeto traz `task_count` |
| GET | `/api/projects/{id}/` | Detalhe de um projeto do usuário |
| DELETE | `/api/projects/{id}/` | Com `?confirm=false`: só responde `{task_count}` e não apaga. Sem o parâmetro: exclui em cascata (204) |
| GET | `/api/tasks/` | Lista tarefas do usuário, já ordenadas por prazo (nulos por último, empate por `created_at`). Filtros: `?status=todo,doing` (aceita vários, separados por vírgula; é assim que a H2 pede só pendentes) e `?project=` |
| POST | `/api/tasks/` | Cria tarefa manual (`source` é sempre `manual`, mesmo se o cliente mandar outro valor) |
| PATCH | `/api/tasks/{id}/` | Edita status, prazo, título e projeto. O projeto de destino precisa ser do usuário (H5). PUT não é aceito |
| DELETE | `/api/tasks/{id}/` | Exclui tarefa |
| GET | `/api/ai/status/` | Responde `{configured: true/false}`: diz só **se** a chave existe, nunca qual é. O painel de IA consulta ao abrir, para avisar antes de o usuário digitar |
| POST | `/api/ai/breakdown/` | Recebe `{project_id, goal_text}` (meta de 1 a 1000 caracteres), chama o provedor de IA e retorna `{project_id, suggestions: [{title, due_date}]}` (**não grava nada**). Sem chave: 503 com `code: "ai_not_configured"` e o aviso de chave não cadastrada. Outras falhas da IA: 502 com mensagem genérica |
| POST | `/api/ai/breakdown/confirm/` | Recebe `{project_id, tasks: [{title, due_date}]}` (1 a 50 itens) e grava tudo numa transação com `source="ai"` |

Todas as rotas terminam em `/` (padrão do Django; sem a barra, o Django não consegue redirecionar um POST mantendo o corpo). Cada tarefa devolvida pela API inclui `project_name`, `project_color` e `is_overdue`, e assim a H2 monta a tela inteira com uma chamada só. Projeto ou tarefa de outro usuário responde 404 (ou 400 quando usado como destino), sem revelar que existe.

A separação entre `breakdown` (sugestão) e `breakdown/confirm` (gravação) implementa diretamente o critério de H4 de que nada é salvo sem confirmação explícita.

## Serviço de IA (backend)

- Módulo isolado `ai_service.py`: monta um prompt com a meta do usuário e a data de hoje (com o dia da semana, para a IA calcular datas absolutas) e pede resposta em JSON estrito (lista de `{title, due_date | null}`).
- Chamada via SDK oficial `anthropic` (Messages API): modelo `claude-opus-5` (configurável por `ANTHROPIC_MODEL`), **saída estruturada** com JSON Schema (`output_config.format`), `effort: low` para responder mais rápido, `fallbacks: "default"` (se o modelo recusar por política, a API tenta o modelo recomendado), timeout de 60 s e 1 nova tentativa.
- Mesmo com saída estruturada, o parse é estrito e independente: chaves exatas, 1 a 20 itens, título não vazio com até 200 caracteres, data `AAAA-MM-DD` válida ou `null`. Qualquer desvio é erro; nada é "consertado".
- `stop_reason` diferente de `end_turn` (recusa, corte por `max_tokens`) também é erro.
- Só a meta é enviada ao provedor: nome e descrição do projeto não saem do backend.
- Logs registram só o tipo ou motivo genérico da falha (ex.: `APITimeoutError`, `stop_reason=refusal`, "JSON inválido") e a quantidade de sugestões; nunca a meta nem a resposta.
- `try/except` em volta da chamada e do parse do JSON — qualquer outra falha vira um erro tratado (HTTP 502 com mensagem genérica pro frontend), nunca uma subtarefa inventada a partir de um parse malsucedido. Implementa o requisito de robustez da constituição/spec.
- Chave de API lida de variável de ambiente (`ANTHROPIC_API_KEY`), nunca hardcoded, nunca em `settings.py` versionado. Sem a chave, o serviço lança `AINotConfiguredError` antes de qualquer chamada, e a view responde 503 com o aviso específico. Sem essa verificação, o SDK só lançaria `TypeError` na hora da requisição, o que viraria erro 500.
- A consulta `/api/ai/status/` evita que o usuário escreva uma meta para só então descobrir que a IA não está disponível. O `503` do `breakdown` continua como garantia, caso a chave seja removida com a tela já aberta.

## Frontend (React)

- Roteamento: `/login`, `/` (visão central — H2), `/projects/:id` (kanban — H3).
- Componente `TaskBreakdownModal`: ao abrir, consulta `/api/ai/status/`; sem chave, mostra o aviso de chave não cadastrada e desabilita o pedido. Com chave: campo de texto livre pra meta → chama `/api/ai/breakdown/` → mostra lista editável (inputs de texto e data por item, botão de remover item) → botão "Adicionar ao projeto" chama `/api/ai/breakdown/confirm/`.
  - Apesar do nome, é um **painel lateral não modal**: não tem fundo bloqueante, e em telas largas a página abre espaço para ele. Durante a espera o usuário continua usando a tela (NFR de tempo de resposta); a espera pode ser cancelada (`AbortController`). Cancelar só descarta a resposta no navegador: a chamada que o backend já fez à Anthropic termina normalmente e não grava nada.
  - Também tem "Descartar sugestão" e "+ Adicionar subtarefa". Fica disponível no kanban (projeto já escolhido) e na visão central (com seletor de projeto).
- Componentes que não estavam no plano, mas as histórias exigem: `ProjectForm` na barra lateral (H1), `TaskForm` com seletor de projeto (H1/H2), `TaskEditor` para editar título/prazo/projeto (H5) e a exclusão de projeto em duas etapas com `window.confirm` (casos extremos).
- Estado global simples via Context API (sem Redux — dependência desnecessária pro tamanho do projeto): `AuthContext` (sessão) e `ProjectsContext` (lista de projetos compartilhada entre barra lateral e seletores).
- Cliente HTTP: um wrapper de `fetch` (sem axios) que injeta o `Bearer`, tenta renovar o token uma vez ao receber 401 e, se não conseguir, encerra a sessão.
- Biblioteca de drag-and-drop para o kanban: `@hello-pangea/dnd` (fork mantido do antigo `react-beautiful-dnd`) — única dependência nova de UI, justificada por implementar H3 sem reescrever drag-and-drop na mão.

## Testes

- Backend: `pytest-django`. Cobertura mínima conforme constituição: criar/editar/excluir projeto e tarefa, e o fluxo de `breakdown` com a chamada de IA mockada (nunca bater na API real nos testes).
- Frontend: a constituição não exige testes automatizados de frontend, mas eles foram adicionados porque os critérios da spec são de interface:
  - **Unitários e de componentes** (`vitest` + Testing Library, em `frontend/src/**/*.test.*`): funções puras, cliente HTTP (renovação de token, mensagens de erro), hooks e comportamento visível de formulários, painel de IA e páginas, com a API sempre simulada.
  - **Aceitação no navegador** (`e2e/acceptance.mjs`, `playwright-core` com Chrome ou Edge já instalado): percorre os critérios H1–H6 contra backend e frontend reais. Com o servidor sem chave, confere o aviso real de chave não cadastrada. Depois simula a IA como disponível (status e sugestões) para testar revisão e confirmação sem depender de chave nem de rede. A gravação da confirmação é real.
- **Qualidade contínua**: GitHub Actions (`.github/workflows/ci.yml`) roda, a cada push, `black --check`, verificação de migrations pendentes, `pytest`, `eslint`, `prettier --check`, `vitest`, build e o roteiro de aceitação.

## Organização do frontend

- `pages/`: telas ligadas a rotas. Orquestram dados e ações; quase não têm marcação própria.
- `components/`: peças visuais reutilizáveis (`TaskRow`, `TaskSection`, `TaskForm`, `TaskEditor`, `ErrorAlert`…), com subpastas por funcionalidade (`kanban/`, `breakdown/`).
- `hooks/`: `useTasks` concentra carregar e atualizar listas de tarefas (com descarte de respostas atrasadas e atualização otimista com reversão); `useAiStatus` consulta se a IA está configurada; `useEscapeKey`.
- `utils/` e `constants/`: regras puras e testáveis sem React (agrupamento das seções da H2, tradução do arraste em mudança de status, mensagem de exclusão).
- `api/client.js`: único ponto que conversa com a API.

## Dependências (justificativa exigida pela constituição)

| Pacote | Onde | Por quê |
|---|---|---|
| `Django`, `djangorestframework` | backend | Stack definida na constituição |
| `djangorestframework-simplejwt` | backend | Autenticação stateless para o SPA (ver Autenticação) |
| `anthropic` | backend | SDK oficial do provedor escolhido; timeouts, novas tentativas e erros tipados sem reescrever cliente HTTP |
| `pytest`, `pytest-django` | backend (dev) | Testes exigidos pela constituição |
| `black` | backend (dev) | Formatação exigida pela constituição |
| `react`, `react-dom` | frontend | Stack definida na constituição |
| `react-router-dom` | frontend | Rotas `/login`, `/`, `/projects/:id` com links reais (voltar/avançar do navegador) |
| `@hello-pangea/dnd` | frontend | Drag-and-drop do kanban (H3) |
| `vite`, `@vitejs/plugin-react` | frontend (dev) | Build e servidor de desenvolvimento (já previstos na T2.1); o proxy substitui o CORS |
| `prettier` | frontend (dev) | Formatação exigida pela constituição |
| `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `globals` | frontend (dev) | Lint: pega erros comuns de JavaScript e uso incorreto de hooks (dependências de efeito, `setState` em efeito) |
| `vitest`, `jsdom` | frontend (dev) | Executor de testes integrado ao Vite, sem configuração de build separada |
| `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | frontend (dev) | Testes de componente guiados pelo que o usuário vê e faz (rótulos, papéis, cliques) |
| `playwright-core` | e2e (dev) | Controla um navegador já instalado no roteiro de aceitação, sem baixar navegadores |

Removida em relação à T1.1: `django-cors-headers` (substituída pelo proxy do Vite).

## Dados de demonstração

- `python manage.py seed_demo` cria (ou recria) o usuário `demo` com 3 projetos e 12 tarefas. Os prazos são calculados a partir do dia em que o comando roda, então sempre há tarefas atrasadas, próximas, sem prazo, em andamento, concluídas e vindas de IA. Só funciona com `DJANGO_DEBUG=1` e não mexe em outros usuários. Existe para a reprodutibilidade: qualquer pessoa vê todas as telas preenchidas em segundos.
