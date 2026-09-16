# Relato de implementação — Painel de Projetos

## O que foi implementado

Todas as histórias da spec (H1–H6), os requisitos não funcionais e os casos extremos.

- **Backend** (`backend/`): Django 6.1 + DRF, autenticação JWT, `ProjectViewSet`, `TaskViewSet`, `ai_service.py` e os dois endpoints de IA. Testes: **100 com pytest-django**, com a IA sempre simulada. Cobrem caminho feliz, 401 sem token, acesso a dado de outro usuário, respostas malformadas da IA, falha de rede, recusa, chave ausente, dados de demonstração e ausência de dado sensível nos logs.
- **Frontend** (`frontend/`): React 19 + Vite, login/cadastro, visão central com seções "Atrasadas / Com prazo / Sem prazo", kanban com drag-and-drop, painel de quebra de meta com IA, cadastro e exclusão de projetos. Organizado em páginas, componentes pequenos, hooks e funções puras (ver `plan.md`, "Organização do frontend"). Testes: **78 com Vitest + Testing Library**, além de ESLint e Prettier.
- **Aceitação no navegador (T3.1):** `e2e/acceptance.mjs` controla Chrome ou Edge e confere **24 critérios** na interface real. Exemplos: projeto aparece no seletor sem recarregar, atrasada no topo e destacada, uma só chamada de lista na H2, concluída some das pendências e aparece em "Concluído", arrastar o card grava no backend e reflete na visão central, meta vazia não chama a IA, aviso de chave do Claude não cadastrada, erro de IA claro com criação manual ainda funcionando, nada gravado antes de "Adicionar ao projeto", mensagem "Este projeto tem N tarefas", sem rolagem horizontal em 400 px, sem erros no console.
- **CI:** GitHub Actions roda tudo isso a cada push.

## O que ficou de fora e por quê

- **Chamada real à API da Anthropic não foi exercitada:** não havia `ANTHROPIC_API_KEY` no ambiente de desenvolvimento. O caminho real sem chave (aviso de chave não cadastrada ao abrir o painel, botão desabilitado, 503 na API) foi testado de ponta a ponta. O caminho de sucesso foi testado com resposta simulada, no backend e no navegador. **É a primeira coisa a validar com uma chave de verdade.**
- **Persistência de sessão ao recarregar a página:** fora por decisão (ver "onde a spec mudou").
- **Deploy/produção** (servir o build pelo Django, Postgres, `DEBUG=0`): não fazia parte das tarefas. As settings já exigem `DJANGO_SECRET_KEY` quando `DJANGO_DEBUG=0`.
- **Reordenar cards dentro da mesma coluna:** o modelo não tem campo de posição. Dentro da coluna, a ordem é por prazo.
- Os itens "fora de escopo" da spec continuam fora.

## Onde a spec (e o resto) mudou durante a implementação

A regra da T3.2 é atualizar spec e plano **antes** de seguir. Na primeira entrega, as mudanças foram registradas nos artefatos ao fim da implementação, na mesma branch e antes do merge (PR #1). A partir da T3.5, spec e plano foram atualizados antes do código, no mesmo commit. O que mudou:

1. **Constituição emendada:** a renovação de token entrou na exceção de "rota sem autenticação". Sem isso, ou o token de acesso teria vida longa, ou o usuário faria login a cada 30 min.
2. **Tokens só em memória no navegador:** a leitura literal de "nenhum token em texto plano em lugar nenhum" exclui `localStorage`. Consequência registrada como critério da H6: F5 pede login de novo. Se o grupo preferir sessão persistente, é preciso emendar a constituição (por exemplo, refresh token em cookie `HttpOnly`).
3. **CORS trocado por proxy do Vite:** uma dependência a menos (`django-cors-headers`), e o mesmo resultado em desenvolvimento.
4. **Filtro `?status=` aceita vários valores**, para a H2 pedir só as pendentes numa chamada.
5. **"Modal" virou painel lateral não modal.** O primeiro teste no navegador mostrou que o painel cobria o botão "Adicionar" e uma coluna do kanban, o que fere o NFR de não travar a tela. Correção: a página abre espaço para o painel.
6. **Critérios novos na spec:** cadastro (H6), mover tarefa só para projeto próprio (H5), meta com mais de 1000 caracteres, IA não configurada, atrasada concluída deixa de ser destacada.
7. **`tasks.md`:** T2.7 (UI de projetos) e T2.8 (UI de editar/concluir) adicionadas, porque nenhuma tarefa de frontend cobria H1 e H5. A contagem do checklist foi corrigida de 8 para 7.
8. **Descoberta técnica:** sem a chave, o SDK da Anthropic lança `TypeError` (e não um erro próprio do SDK) na hora da requisição, o que viraria erro 500. O serviço agora verifica a chave antes de chamar e devolve um erro tratado. Há teste para isso.
9. **Revisão de qualidade após a primeira entrega (T3.4):** três telas tinham entre 200 e 270 linhas misturando dados, estado e marcação. Foram divididas em componentes (`TaskRow`, `TaskSection`, `kanban/*`, `breakdown/*`…), no hook `useTasks` e em funções puras. Os testes novos acharam um bug: quando concluir uma tarefa falhava, o recarregamento da lista apagava a mensagem de erro antes de o usuário vê-la. Corrigido.
10. **Aviso de chave não cadastrada (T3.5):** antes, sem chave, a IA mostrava a mesma mensagem genérica de qualquer falha. Agora o painel consulta `/api/ai/status/` ao abrir e avisa "Chave da API do Claude não cadastrada. Por isso não é possível executar esta ação de IA", com o botão desabilitado. A spec (casos extremos) e o plano foram atualizados antes do código.
11. **Reprodutibilidade (T3.6):** `seed_demo` cria um usuário com dados de exemplo e prazos relativos ao dia atual. Uma auditoria da documentação corrigiu afirmações que tinham ficado desatualizadas: a versão mínima do Node.js para rodar os testes (22.22.2+, e não 20.19+), contagens de testes e a frequência com que a barra lateral recarrega. O plano também passou a explicar que cancelar a espera da IA no navegador não interrompe a chamada já feita pelo servidor.

Detalhes da revisão dos artefatos: `ANALISE.md`.
