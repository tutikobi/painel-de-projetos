# Tarefas — Painel de Projetos

Cada tarefa referencia a história/seção da spec que ela implementa. Ordem sugerida de execução.

## Semana 1 — artefatos de intenção (sem código de produção)

- [ ] T0.1 — Instalar Spec Kit (ou revisar manualmente `constitution.md`, `spec.md`, `plan.md`, `tasks.md` como feito aqui).
- [ ] T0.2 — Validar `constitution.md` com o checklist do laboratório: cada princípio é verificável?
- [ ] T0.3 — Validar `spec.md` com o checklist de 8 itens (já marcado acima).
- [ ] T0.4 — Revisar `plan.md`: cada decisão técnica tem justificativa e referência a um item da spec/constituição.

## Semana 2 — implementação

### Backend — setup
- [ ] T1.1 — Criar projeto Django + app `core`; configurar DRF, `djangorestframework-simplejwt`, CORS para o dev server do React. *(spec: H6)*
- [ ] T1.2 — Modelos `Project` e `Task` + migration inicial. *(plan: Modelo de dados)*
- [ ] T1.3 — Endpoints de auth (`register`, `login`) com `IsAuthenticated` como padrão global. *(spec: H6)*

### Backend — projetos e tarefas
- [ ] T1.4 — `ProjectViewSet` (list/create/delete) filtrado por `owner=request.user`; endpoint de exclusão retorna contagem de tarefas antes de confirmar. *(spec: H1, caso extremo de exclusão)*
- [ ] T1.5 — `TaskViewSet` (list/create/update/delete) com filtros `status`/`project` e ordenação por `due_date` (nulls por último, numa seção separada). *(spec: H2, H3, H5)*
- [ ] T1.6 — Testes automatizados dos dois viewsets: caminho feliz + tentativa sem autenticação (401) + tentativa de acessar dado de outro usuário. *(constituição: segurança e testes)*

### Backend — IA
- [ ] T1.7 — Módulo `ai_service.py`: prompt + chamada à API da Anthropic + parse estrito de JSON, com tratamento de erro. *(plan: Serviço de IA; spec: H4)*
- [ ] T1.8 — Endpoint `/api/ai/breakdown/` (só retorna sugestão, não grava). *(spec: H4)*
- [ ] T1.9 — Endpoint `/api/ai/breakdown/confirm/` (grava tarefas com `source="ai"`). *(spec: H4)*
- [ ] T1.10 — Teste automatizado do fluxo de IA com a chamada externa mockada, cobrindo o caso de resposta malformada. *(constituição: robustez de IA)*

### Frontend
- [ ] T2.1 — Setup do projeto React (Vite), roteamento (`/login`, `/`, `/projects/:id`), cliente HTTP com interceptor de JWT.
- [ ] T2.2 — Tela de login/registro.
- [ ] T2.3 — Visão central (H2): lista de tarefas de todos os projetos, ordenada por prazo, seção "sem prazo" separada, destaque visual pra atrasadas.
- [ ] T2.4 — Tela de kanban por projeto (H3) com drag-and-drop entre colunas, atualizando status via PATCH.
- [ ] T2.5 — `TaskBreakdownModal` (H4): input de meta → chama breakdown → lista editável → confirmar grava.
- [ ] T2.6 — Estados de carregamento/erro explícitos na chamada de IA (spinner + mensagem de erro que não bloqueia o resto da tela). *(spec: NFR de tempo de resposta e robustez)*

### Fechamento
- [ ] T3.1 — Revisar cada tarefa marcada como concluída contra o critério de aceitação correspondente na spec (não só "rodou sem erro").
- [ ] T3.2 — Se algo mudou de ideia no meio da implementação, **voltar e atualizar `spec.md`/`plan.md` antes** de seguir (regra da fase 4 — nada de patch silencioso no código).
- [ ] T3.3 — Escrever `RELATO.md` de uma página: o que foi implementado, o que ficou de fora do escopo original e por quê, e onde a spec mudou durante a implementação.
