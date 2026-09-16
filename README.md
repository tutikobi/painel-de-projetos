# Painel de Projetos

Painel pessoal para quem toca vários projetos ao mesmo tempo. Reúne as pendências de todos numa visão ordenada por prazo, tem um kanban por projeto e usa IA (Claude, da Anthropic) para quebrar uma meta grande em subtarefas com prazos sugeridos. Nada sugerido pela IA é salvo sem a sua revisão.

Projeto feito com desenvolvimento orientado a especificação:

| Arquivo | Papel |
|---|---|
| [`00_prompt-inicial.md`](00_prompt-inicial.md) | Rascunho da ideia |
| [`constitution.md`](constitution.md) | Princípios não negociáveis |
| [`spec.md`](spec.md) | Histórias, critérios de aceitação, casos extremos |
| [`plan.md`](plan.md) | Decisões técnicas e dependências |
| [`tasks.md`](tasks.md) | Tarefas rastreadas até a spec |
| [`ANALISE.md`](ANALISE.md) | Revisão dos artefatos (T0.2–T0.4) |
| [`RELATO.md`](RELATO.md) | O que foi feito e o que mudou (T3.3) |

## Requisitos

- Python 3.12+ (testado com 3.14)
- Node.js 20+ (testado com 24)
- Opcional: `ANTHROPIC_API_KEY` para a quebra de metas com IA. Sem ela, o resto do sistema funciona normalmente e o painel de IA mostra uma mensagem de erro.

## Como rodar

**Backend** (terminal 1):

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate   |   Linux/macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
# opcional (PowerShell): $env:ANTHROPIC_API_KEY = "sk-ant-..."
# opcional (bash):       export ANTHROPIC_API_KEY=sk-ant-...
python manage.py runserver 127.0.0.1:8000
```

**Frontend** (terminal 2):

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173 e crie uma conta na aba "Criar conta". O Vite repassa `/api` para o Django, então não é preciso configurar CORS.

> A sessão fica só em memória, por regra da constituição. Recarregar a página (F5) pede login de novo.

Variáveis opcionais do backend: veja [`backend/.env.example`](backend/.env.example).

## Qualidade

```bash
cd backend && python -m pytest && black --check .
cd frontend && npx prettier --check . && npm run build
```

## Estrutura

```
backend/
  config/          settings e rotas raiz
  core/
    models.py        Project, Task
    serializers.py
    views.py         auth, projetos, tarefas, endpoints de IA
    ai_service.py    chamada à Anthropic + parse estrito
    tests/           pytest-django (IA sempre simulada)
frontend/
  src/
    api/client.js    fetch + JWT em memória + renovação de token
    context/         AuthContext, ProjectsContext
    pages/           LoginPage, CentralView (H2), ProjectBoard (H3)
    components/      TaskBreakdownModal (H4), TaskForm, TaskEditor, ...
```
