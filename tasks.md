# Tarefas — Painel de Projetos

Cada tarefa referencia a história/seção da spec que ela implementa. Ordem sugerida de execução.

## Semana 1 — artefatos de intenção (sem código de produção)

- [x] T0.1 — Instalar Spec Kit (ou revisar manualmente `constitution.md`, `spec.md`, `plan.md`, `tasks.md` como feito aqui).
- [x] T0.2 — Validar `constitution.md` com o checklist do laboratório: cada princípio é verificável?
- [x] T0.3 — Validar `spec.md` com o checklist de 7 itens (já marcado acima). *(o texto original dizia 8 itens; a spec tem 7)*
- [x] T0.4 — Revisar `plan.md`: cada decisão técnica tem justificativa e referência a um item da spec/constituição.

## Semana 2 — implementação

### Backend — setup
- [x] T1.1 — Criar projeto Django + app `core`; configurar DRF, `djangorestframework-simplejwt`, CORS para o dev server do React. *(spec: H6)* — *CORS substituído pelo proxy do Vite; ver plan.md*
- [x] T1.2 — Modelos `Project` e `Task` + migration inicial. *(plan: Modelo de dados)*
- [x] T1.3 — Endpoints de auth (`register`, `login`) com `IsAuthenticated` como padrão global. *(spec: H6)*

### Backend — projetos e tarefas
- [x] T1.4 — `ProjectViewSet` (list/create/delete) filtrado por `owner=request.user`; endpoint de exclusão retorna contagem de tarefas antes de confirmar. *(spec: H1, caso extremo de exclusão)*
- [x] T1.5 — `TaskViewSet` (list/create/update/delete) com filtros `status`/`project` e ordenação por `due_date` (nulls por último, numa seção separada). *(spec: H2, H3, H5)*
- [x] T1.6 — Testes automatizados dos dois viewsets: caminho feliz + tentativa sem autenticação (401) + tentativa de acessar dado de outro usuário. *(constituição: segurança e testes)*

### Backend — IA
- [x] T1.7 — Módulo `ai_service.py`: prompt + chamada à API da Anthropic + parse estrito de JSON, com tratamento de erro. *(plan: Serviço de IA; spec: H4)*
- [x] T1.8 — Endpoint `/api/ai/breakdown/` (só retorna sugestão, não grava). *(spec: H4)*
- [x] T1.9 — Endpoint `/api/ai/breakdown/confirm/` (grava tarefas com `source="ai"`). *(spec: H4)*
- [x] T1.10 — Teste automatizado do fluxo de IA com a chamada externa mockada, cobrindo o caso de resposta malformada. *(constituição: robustez de IA)*

### Frontend
- [x] T2.1 — Setup do projeto React (Vite), roteamento (`/login`, `/`, `/projects/:id`), cliente HTTP com interceptor de JWT.
- [x] T2.2 — Tela de login/registro.
- [x] T2.3 — Visão central (H2): lista de tarefas de todos os projetos, ordenada por prazo, seção "sem prazo" separada, destaque visual pra atrasadas.
- [x] T2.4 — Tela de kanban por projeto (H3) com drag-and-drop entre colunas, atualizando status via PATCH.
- [x] T2.5 — `TaskBreakdownModal` (H4): input de meta → chama breakdown → lista editável → confirmar grava.
- [x] T2.6 — Estados de carregamento/erro explícitos na chamada de IA (spinner + mensagem de erro que não bloqueia o resto da tela). *(spec: NFR de tempo de resposta e robustez)*
- [x] T2.7 — Cadastro de projeto na barra lateral e exclusão em duas etapas ("Este projeto tem N tarefas…"). *(spec: H1, caso extremo de exclusão)* — *adicionada: nenhuma tarefa de frontend cobria a H1*
- [x] T2.8 — Concluir tarefa na visão central e editar título/prazo/projeto na visão central e no kanban. *(spec: H5)* — *adicionada: nenhuma tarefa de frontend cobria a H5*

### Fechamento
- [x] T3.1 — Revisar cada tarefa marcada como concluída contra o critério de aceitação correspondente na spec (não só "rodou sem erro").
- [x] T3.2 — Se algo mudou de ideia no meio da implementação, **voltar e atualizar `spec.md`/`plan.md` antes** de seguir (regra da fase 4 — nada de patch silencioso no código).
- [x] T3.3 — Escrever `RELATO.md` de uma página: o que foi implementado, o que ficou de fora do escopo original e por quê, e onde a spec mudou durante a implementação.
- [x] T3.4 — Revisão de qualidade: componentizar as páginas do frontend, adicionar lint e testes automatizados de frontend, versionar o roteiro de aceitação e configurar CI. *(constituição: padrões de código e teste)* — *adicionada após a primeira entrega*
- [x] T3.5 — Aviso específico de chave da API do Claude não cadastrada ao usar a IA. *(spec: casos extremos)* — *adicionada a pedido do autor*
- [x] T3.6 — Comando `seed_demo`, README de reprodutibilidade e apresentação em slides das funcionalidades (`docs/apresentacao/`). — *adicionada a pedido do autor*
