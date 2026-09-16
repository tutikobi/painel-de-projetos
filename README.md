# Painel de Projetos

Painel pessoal para quem toca vários projetos ao mesmo tempo. Reúne as pendências de todos numa visão ordenada por prazo, tem um kanban por projeto e usa IA (Claude, da Anthropic) para quebrar uma meta grande em subtarefas com prazos sugeridos. Nada sugerido pela IA é salvo sem a sua revisão.

**Stack:** Django 6 + Django REST Framework + SQLite · React 19 + Vite · API da Anthropic

Projeto feito com desenvolvimento orientado a especificação (spec-driven):

| Arquivo | Papel |
|---|---|
| [`00_prompt-inicial.md`](00_prompt-inicial.md) | Rascunho da ideia |
| [`constitution.md`](constitution.md) | Princípios não negociáveis |
| [`spec.md`](spec.md) | Histórias, critérios de aceitação, casos extremos |
| [`plan.md`](plan.md) | Decisões técnicas, organização do código e dependências |
| [`tasks.md`](tasks.md) | Tarefas rastreadas até a spec |
| [`ANALISE.md`](ANALISE.md) | Revisão dos artefatos (T0.2–T0.4) |
| [`RELATO.md`](RELATO.md) | O que foi feito e o que mudou (T3.3) |

## Requisitos

- Python 3.12+
- Node.js 20.19+ ou 22.12+
- Opcional: `ANTHROPIC_API_KEY` para a quebra de metas com IA. Sem ela, o resto do sistema funciona normalmente e o painel de IA mostra uma mensagem de erro.

## Como rodar

O sistema tem duas partes, e **as duas precisam estar rodando ao mesmo tempo**, cada uma no seu terminal:

- o **backend** (Django, porta 8000) guarda os dados e faz login, projetos, tarefas e a chamada à IA;
- o **frontend** (Vite, porta 5173) é a tela. Ele repassa as chamadas `/api` para o backend.

Só com o frontend a tela abre, mas o login não funciona.

**Terminal 1 — backend**

```bash
cd backend
python -m venv .venv
# Windows (PowerShell): .venv\Scripts\Activate.ps1
# Linux/macOS:          source .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Para usar a IA, defina a chave **antes** do `runserver`:

```bash
# PowerShell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
# bash
export ANTHROPIC_API_KEY=sk-ant-...
```

**Terminal 2 — frontend**

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173 e crie uma conta na aba "Criar conta".

> A sessão fica só em memória, por regra da constituição. Recarregar a página (F5) pede login de novo.

Outras variáveis opcionais do backend estão em [`backend/.env.example`](backend/.env.example).

## Testes e qualidade

| O quê | Comando | Onde |
|---|---|---|
| Testes da API (89) | `python -m pytest` | `backend/` |
| Formatação Python | `black --check .` | `backend/` |
| Testes de frontend (74) | `npm test` | `frontend/` |
| Lint | `npm run lint` | `frontend/` |
| Formatação JS | `npm run format:check` | `frontend/` |
| Build | `npm run build` | `frontend/` |
| Aceitação no navegador (23 critérios) | `npm install && npm test` | `e2e/`, com backend e frontend rodando |

O roteiro de aceitação usa o Chrome ou o Edge já instalado (padrão: Edge no Windows, Chrome nos demais sistemas). Para trocar, use `E2E_BROWSER_CHANNEL=chrome`, e `E2E_HEADED=1` para ver o navegador trabalhando.

A cada push, o GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) roda todos esses passos.

## Estrutura

```
backend/
  config/              settings e rotas raiz
  core/
    models.py          Project, Task
    serializers.py     validação e formato da API
    views.py           auth, projetos, tarefas, endpoints de IA
    ai_service.py      chamada à Anthropic + parse estrito da resposta
    tests/             pytest-django (IA sempre simulada)
frontend/src/
  api/client.js        único ponto de contato com a API (JWT em memória, renovação)
  context/             AuthContext (sessão), ProjectsContext (projetos)
  hooks/               useTasks (carregar/atualizar tarefas), useEscapeKey
  pages/               LoginPage, CentralView (H2), ProjectBoard (H3)
  components/          TaskRow, TaskSection, TaskForm, TaskEditor, ErrorAlert, ...
    kanban/            KanbanBoard, KanbanColumn, TaskCard
    breakdown/         GoalForm, SuggestionReview (painel de IA, H4)
  utils/, constants/   regras puras (seções da H2, arraste, mensagens)
  **/*.test.js(x)      testes ao lado do código testado
e2e/acceptance.mjs     roteiro de aceitação no navegador
```
