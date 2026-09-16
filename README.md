# Painel de Projetos

Painel pessoal para quem toca vários projetos ao mesmo tempo. Ele junta as pendências de todos numa visão ordenada por prazo, oferece um kanban por projeto e usa IA (Claude, da Anthropic) para quebrar uma meta grande em subtarefas com prazos sugeridos. Nada sugerido pela IA é salvo sem a revisão do usuário.

**Stack:** Django 6.1 + Django REST Framework + SQLite · React 19 + Vite 8 · API da Anthropic
**Apresentação com todas as telas:** [`docs/apresentacao/index.html`](docs/apresentacao/index.html) (baixe o repositório e abra no navegador; use as setas do teclado)

## Sumário

1. [O que o sistema faz](#1-o-que-o-sistema-faz)
2. [Requisitos](#2-requisitos)
3. [Como rodar (passo a passo)](#3-como-rodar-passo-a-passo)
4. [Usuário de demonstração](#4-usuário-de-demonstração)
5. [Configurando a IA (opcional)](#5-configurando-a-ia-opcional)
6. [Roteiro para testar manualmente](#6-roteiro-para-testar-manualmente)
7. [Testes automatizados](#7-testes-automatizados)
8. [Reprodutibilidade](#8-reprodutibilidade)
9. [Solução de problemas](#9-solução-de-problemas)
10. [Estrutura do projeto](#10-estrutura-do-projeto)
11. [Documentação spec-driven](#11-documentação-spec-driven)
12. [Limitações conhecidas](#12-limitações-conhecidas)

---

## 1. O que o sistema faz

| Funcionalidade | O que dá para fazer | História |
|---|---|---|
| Login e cadastro | Criar conta e entrar. Cada usuário só vê os próprios dados | H6 |
| Projetos | Criar projeto com nome, descrição curta e cor; excluir com confirmação | H1 |
| Visão central | Ver todas as tarefas abertas de todos os projetos, separadas em **Atrasadas**, **Com prazo** e **Sem prazo**, da mais urgente para a menos urgente | H2 |
| Tarefas | Criar, concluir, editar (título, prazo, projeto) e excluir | H5 |
| Kanban | Por projeto, colunas **A fazer / Em andamento / Concluído**, arrastando cards entre elas | H3 |
| Quebra de meta com IA | Escrever uma meta ("escrever o capítulo 3 até dia 30"), receber subtarefas com prazos, revisar e só então salvar | H4 |

### O que a IA faz, exatamente

1. Você escolhe o projeto e escreve uma meta em texto livre.
2. O **backend** (nunca o navegador) envia ao Claude a meta e a data de hoje. Nome e descrição do projeto não são enviados.
3. O Claude devolve de 3 a 10 subtarefas em ordem, cada uma com título e prazo:
   - prazos em datas reais, distribuídos até o prazo final citado na meta;
   - se a meta não cita prazo, as subtarefas vêm **sem prazo**, sem datas inventadas.
4. O backend confere a resposta com rigor (formato, datas válidas, títulos não vazios). Qualquer desvio vira erro; nada é "consertado" nem salvo.
5. Você revisa: edita títulos e prazos, remove ou adiciona itens, ou descarta tudo.
6. Só ao clicar em **Adicionar ao projeto** as tarefas são gravadas, marcadas com o selo **IA**.

Exemplo (hoje = 16/09/2026). A meta *"Escrever o capítulo 3 da dissertação até dia 30"* pode gerar: *Reler anotações do capítulo 2 (18/09) → Definir estrutura do capítulo 3 (19/09) → Escrever a seção 3.1 (22/09) → Escrever a seção 3.2 (25/09) → Revisar texto e referências (28/09) → Enviar ao orientador (30/09)*. A resposta real varia a cada chamada.

**Sem a chave da API cadastrada**, o painel de IA mostra ao abrir: *"Chave da API do Claude não cadastrada. Por isso não é possível executar esta ação de IA."* O botão de sugestões fica desabilitado e todo o resto do sistema continua funcionando.

---

## 2. Requisitos

| Ferramenta | Versão mínima | Versão testada | Para quê |
|---|---|---|---|
| Python | 3.12 | 3.14.5 (local), 3.13 (CI) | Backend |
| Node.js | 22.22.2 ou 24.15 | 24.16 (local), 22 (CI) | Frontend e testes. Com Node 20.19 a aplicação roda, mas os testes do frontend não |
| npm | o que vem com o Node | 11.13 | Dependências do frontend |
| Git | qualquer recente | 2.54 | Baixar o projeto |
| Chrome ou Edge | qualquer recente | Edge (Windows), Chrome (Ubuntu) | Usar o sistema e rodar o roteiro de aceitação |
| Chave da API da Anthropic | — | — | **Opcional**, só para a IA gerar sugestões de verdade |

Sistemas verificados: Windows 11 (desenvolvimento) e Ubuntu (GitHub Actions). Não é preciso instalar banco de dados: o SQLite já vem com o Python.

---

## 3. Como rodar (passo a passo)

O sistema tem **duas partes que precisam rodar ao mesmo tempo, cada uma no seu terminal**:

| Parte | Porta | Papel |
|---|---|---|
| Backend (Django) | 8000 | Guarda os dados; faz login, projetos, tarefas e a chamada à IA |
| Frontend (Vite) | 5173 | A tela. Repassa as chamadas `/api` para o backend |

Só com o frontend a tela abre, mas o login falha.

### 3.1 Baixar o projeto

```bash
git clone https://github.com/tutikobi/painel-de-projetos.git
cd painel-de-projetos
```

### 3.2 Terminal 1: backend

**Windows (PowerShell)**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 127.0.0.1:8000
```

**Linux / macOS**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 127.0.0.1:8000
```

Deixe esse terminal aberto. `seed_demo` é opcional: ele cria o usuário de demonstração da [seção 4](#4-usuário-de-demonstração).

### 3.3 Terminal 2: frontend

```bash
cd frontend
npm ci
npm run dev
```

`npm ci` instala exatamente as versões do `package-lock.json`.

### 3.4 Abrir

Acesse **http://localhost:5173** e entre com o usuário de demonstração, ou crie uma conta na aba "Criar conta".

> A sessão fica só na memória do navegador, por regra da constituição (nenhum token salvo em texto plano). **Recarregar a página (F5) pede login de novo.** Navegar pelos links da tela não desloga.

Na próxima vez, basta repetir `Activate` + `runserver` no terminal 1 e `npm run dev` no terminal 2.

---

## 4. Usuário de demonstração

```bash
cd backend
python manage.py seed_demo
```

| Usuário | Senha |
|---|---|
| `demo` | `Painel-demo-2026` |

O comando cria 3 projetos (*TCC — Mestrado*, *Site da Padaria Pão Quente*, *Artigo para congresso*) e 12 tarefas. Os prazos são calculados a partir do **dia em que o comando roda**, então sempre existem tarefas atrasadas, próximas, sem prazo, em andamento, concluídas e vindas de IA. Rodar de novo **apaga e recria só os dados do `demo`**; outros usuários não são afetados. Para escolher outras credenciais: `python manage.py seed_demo --username ana --password Outra-senha-123`. O comando só funciona com `DJANGO_DEBUG=1` (o padrão em desenvolvimento).

---

## 5. Configurando a IA (opcional)

Sem chave, tudo funciona, menos a geração de sugestões, que mostra o aviso de chave não cadastrada.

1. Crie uma chave em https://console.anthropic.com. O uso da API é pago por consumo.
2. No **terminal do backend**, pare o servidor (Ctrl+C), defina a chave e suba de novo:

   ```powershell
   # Windows (PowerShell) — vale só para este terminal
   $env:ANTHROPIC_API_KEY = "sk-ant-..."
   python manage.py runserver 127.0.0.1:8000
   ```

   ```bash
   # Linux / macOS
   export ANTHROPIC_API_KEY=sk-ant-...
   python manage.py runserver 127.0.0.1:8000
   ```

3. Abra o painel **Quebrar meta com IA**. O aviso não deve mais aparecer.

A chave fica só no ambiente do backend: nunca vai para o navegador, para o banco ou para o repositório. Não coloque a chave em arquivos versionados.

| Variável | Padrão | Uso |
|---|---|---|
| `ANTHROPIC_API_KEY` | (vazia) | Chave da API. Sem ela, aparece o aviso de chave não cadastrada |
| `ANTHROPIC_MODEL` | `claude-opus-5` | Modelo usado |
| `AI_TIMEOUT_SECONDS` | `60` | Tempo máximo de espera pela IA |
| `DJANGO_DEBUG` | `1` | `0` desliga o modo de desenvolvimento e exige `DJANGO_SECRET_KEY` |
| `DJANGO_SECRET_KEY` | chave de desenvolvimento | Obrigatória com `DJANGO_DEBUG=0` |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Hosts aceitos pelo Django |

---

## 6. Roteiro para testar manualmente

Com os dois servidores rodando e o usuário `demo` criado:

| # | Faça | Deve acontecer |
|---|---|---|
| 1 | Abra http://localhost:5173 | Vai para a tela de login |
| 2 | Aba "Criar conta", usuário `teste`, senha `123` | Erro explicando a regra de senha |
| 3 | Entre com `demo` / `Painel-demo-2026` | Tela **Pendências** com as seções Atrasadas, Com prazo e Sem prazo |
| 4 | Observe as atrasadas | Aparecem primeiro, com borda vermelha e selo "Atrasada" |
| 5 | Barra lateral → **+ Novo projeto**, nome "Curso de inglês" | O projeto aparece na barra lateral e no seletor "Projeto…" |
| 6 | Crie uma tarefa nesse projeto, sem prazo | Aparece em **Sem prazo** |
| 7 | Marque a caixinha de uma tarefa | Ela some das pendências |
| 8 | **Editar** em uma tarefa: troque prazo e projeto, **Salvar** | A tarefa muda de seção e de projeto |
| 9 | Clique em **TCC — Mestrado** | Kanban com A fazer / Em andamento / Concluído; a tarefa concluída no passo 7 está em Concluído, se era desse projeto |
| 10 | Arraste um card para outra coluna e volte em **Pendências** | A mudança já aparece, sem recarregar |
| 11 | **Quebrar meta com IA** (sem chave) | Aviso amarelo "Chave da API do Claude não cadastrada" e botão desabilitado |
| 12 | Com o painel aberto, crie uma tarefa manual | Funciona normalmente |
| 13 | (Com chave) escreva "Escrever o capítulo 3 até dia 30" e peça sugestões | Carregando → lista editável; nada é salvo até **Adicionar ao projeto**; as tarefas salvas ganham o selo **IA** |
| 14 | (Com chave) peça sugestões com a meta só com espaços | Mensagem pedindo a meta, sem chamar a IA |
| 15 | No kanban, **Excluir projeto** | Confirmação "Este projeto tem N tarefas. Excluir mesmo assim?" |
| 16 | Aperte F5 | Volta ao login (sessão só em memória) |
| 17 | **Sair** | Volta ao login |

Para voltar os dados ao estado inicial: `python manage.py seed_demo`.

---

## 7. Testes automatizados

| Tipo | Quantidade | Comando | Onde rodar |
|---|---|---|---|
| API (pytest-django) | 100 | `python -m pytest` | `backend/` (com o `.venv` ativo) |
| Formatação Python | — | `black --check .` | `backend/` |
| Migrations em dia | — | `python manage.py makemigrations --check --dry-run` | `backend/` |
| Frontend (Vitest + Testing Library) | 78 | `npm test` | `frontend/` |
| Lint | — | `npm run lint` | `frontend/` |
| Formatação JS | — | `npm run format:check` | `frontend/` |
| Build de produção | — | `npm run build` | `frontend/` |
| Aceitação no navegador | 24 verificações | `npm ci` e depois `npm test` | `e2e/`, **com backend e frontend rodando** |

Nenhum teste chama a API real da Anthropic: nos testes de backend e frontend a IA é simulada. O roteiro de aceitação confere o aviso real de chave não cadastrada (quando o servidor roda sem chave) e depois simula a IA disponível para testar revisão e confirmação.

O roteiro de aceitação usa o **navegador já instalado**, sem download:

| Variável | Efeito |
|---|---|
| `E2E_BROWSER_CHANNEL=chrome` ou `msedge` | Qual navegador usar (padrão: Edge no Windows, Chrome nos demais) |
| `E2E_BROWSER_PATH=/caminho/do/navegador` | Executável específico |
| `E2E_HEADED=1` | Mostra a janela do navegador trabalhando |
| `E2E_SCREENSHOTS=pasta` | Salva capturas de tela |

O roteiro cria um usuário novo a cada execução (`e2e_<data>`), então não mexe no `demo`.

As capturas usadas na apresentação são geradas por `npm run capturas` (em `e2e/`, depois de `seed_demo`). Esse comando adiciona tarefas ao `demo`; rode `seed_demo` de novo em seguida.

A cada push, o **GitHub Actions** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) roda tudo isso em uma máquina Ubuntu limpa.

---

## 8. Reprodutibilidade

- **Versões fixadas:**
  - `backend/requirements.txt` e `requirements-dev.txt` usam versões exatas (`==`);
  - `frontend/package-lock.json` e `e2e/package-lock.json` travam a árvore inteira, que `npm ci` instala exatamente;
  - `frontend/package.json` declara a versão de Node exigida (`engines`).
- **Banco local e descartável:** o SQLite (`backend/db.sqlite3`) não é versionado. `migrate` + `seed_demo` recriam o estado de demonstração em qualquer máquina.
- **Datas relativas:** os dados de demonstração e o roteiro de aceitação calculam prazos a partir do dia atual, então "atrasada" e "próxima" continuam verdadeiras em qualquer data.
- **Ambiente limpo comprovado:** o CI instala tudo do zero e roda testes, build e o roteiro no navegador a cada push.
- **O que não é reprodutível:**
  - as **sugestões reais da IA** variam a cada chamada (é um modelo de linguagem) e dependem de chave, créditos e internet. Por isso os testes nunca dependem delas;
  - sem chave, o comportamento esperado é o aviso de chave não cadastrada.

---

## 9. Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Login diz "Sem conexão com o servidor" ou "O servidor não respondeu" | Backend parado | Suba o backend (seção 3.2) e confira http://127.0.0.1:8000/api/projects/ (deve responder 401) |
| `Activate.ps1 não pode ser carregado` no PowerShell | Política de execução do Windows | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, ou use `.\.venv\Scripts\python manage.py ...` sem ativar |
| `python` não encontrado no Windows | Python fora do PATH | Use `py -3.12` (ou a versão instalada) no lugar de `python` |
| `npm test` falha com erro de versão do Node | Node abaixo de 22.22.2 | Instale Node 24 LTS |
| `Port 5173 is already in use` / `Error: That port is already in use` | Servidor antigo ainda aberto | Feche o outro terminal ou encerre o processo que usa a porta |
| Página em branco ou 404 em `/api/...` | Frontend aberto por outra porta ou backend em outra porta | Use http://localhost:5173 e o backend em `127.0.0.1:8000` |
| Voltei para o login sozinho | F5 ou 1 dia sem renovar a sessão | Comportamento esperado; entre de novo |
| Painel de IA mostra "Chave da API do Claude não cadastrada" | Backend sem `ANTHROPIC_API_KEY` | Seção 5. A variável precisa ser definida **no mesmo terminal** e **antes** do `runserver` |
| IA com chave mostra "Não foi possível gerar sugestões agora" | Chave inválida, sem créditos, sem internet ou resposta fora do formato | Confira a chave e os créditos no console da Anthropic; o terminal do backend mostra o tipo do erro |
| Roteiro de aceitação: navegador não encontrado | Canal padrão não instalado | `E2E_BROWSER_CHANNEL=chrome` (ou `msedge`), ou `E2E_BROWSER_PATH` |
| Quero zerar tudo | — | Pare o backend, apague `backend/db.sqlite3` e rode `migrate` + `seed_demo` |

---

## 10. Estrutura do projeto

```
backend/
  config/                   settings e rotas raiz
  core/
    models.py               Project, Task
    serializers.py          validação e formato da API
    views.py                auth, projetos, tarefas, endpoints de IA
    ai_service.py           chamada à Anthropic + validação estrita da resposta
    management/commands/    seed_demo (dados de demonstração)
    tests/                  pytest-django (IA sempre simulada)
frontend/src/
  api/client.js             único ponto de contato com a API (JWT em memória, renovação)
  context/                  AuthContext (sessão), ProjectsContext (projetos)
  hooks/                    useTasks, useAiStatus, useEscapeKey
  pages/                    LoginPage, CentralView (H2), ProjectBoard (H3)
  components/               TaskRow, TaskSection, TaskForm, TaskEditor, alertas...
    kanban/                 KanbanBoard, KanbanColumn, TaskCard
    breakdown/              GoalForm, SuggestionReview (painel de IA, H4)
  utils/, constants/        regras puras (seções da H2, arraste, mensagens)
  **/*.test.js(x)           testes ao lado do código testado
e2e/
  acceptance.mjs            roteiro de aceitação no navegador
  capture-screens.mjs       gera as capturas da apresentação
docs/apresentacao/          slides (index.html) e capturas de tela
.github/workflows/ci.yml    integração contínua
```

Os endpoints da API estão descritos em [`plan.md`](plan.md#endpoints-da-api).

---

## 11. Documentação spec-driven

| Arquivo | Papel |
|---|---|
| [`00_prompt-inicial.md`](00_prompt-inicial.md) | Rascunho da ideia, antes de qualquer artefato |
| [`constitution.md`](constitution.md) | Princípios não negociáveis (stack, segurança, papel da IA, testes) |
| [`spec.md`](spec.md) | Histórias H1–H6, critérios de aceitação, casos extremos |
| [`plan.md`](plan.md) | Decisões técnicas, endpoints, organização do código e dependências |
| [`tasks.md`](tasks.md) | Tarefas rastreadas até a spec |
| [`ANALISE.md`](ANALISE.md) | Revisão crítica dos artefatos (T0.2–T0.4) |
| [`RELATO.md`](RELATO.md) | O que foi feito, o que ficou de fora e onde a spec mudou |

---

## 12. Limitações conhecidas

- **A chamada real à Anthropic não foi exercitada durante o desenvolvimento** (não havia chave disponível). O caminho sem chave foi testado de ponta a ponta. O caminho com sugestões foi testado com respostas simuladas, que seguem o formato que o código exige. Com uma chave de verdade, é o primeiro ponto a validar.
- F5 exige novo login (decisão derivada da constituição).
- Não há reordenação de cards dentro da mesma coluna: a ordem é sempre por prazo.
- Configuração só de desenvolvimento: não há deploy, Postgres nem servidor de arquivos estáticos configurados.
- Cancelar a espera da IA no navegador não interrompe a chamada que o backend já fez. Ela termina e é descartada, sem gravar nada.
