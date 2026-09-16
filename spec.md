# Especificação — Painel de Projetos

## Contexto

Ferramenta pessoal para quem toca vários projetos/clientes em paralelo (freelancer, consultor, ou aluno com projetos + TCC). Hoje as pendências de cada projeto ficam espalhadas (memória, chat, e-mail) e não existe uma visão única do que está atrasado. O sistema resolve dois problemas: (1) centralizar tarefas de múltiplos projetos numa única visão ordenada por prazo, e (2) usar IA para quebrar uma meta vaga e grande ("escrever capítulo 3") em subtarefas menores com prazos sugeridos.

## Histórias de usuário e critérios de aceitação

### H1 — Cadastrar projetos
Como usuário, quero cadastrar um projeto (nome, descrição curta, cor de identificação) para poder organizar tarefas dentro dele.
- Critério: um projeto criado aparece imediatamente na lista de projetos e no seletor de projeto ao criar uma tarefa.
- Critério: dois projetos podem ter o mesmo nome (não há restrição de unicidade) — o sistema não impede, mas isso é assumido como comportamento aceitável, não um bug.

### H2 — Visão central de pendências
Como usuário, quero ver, numa única tela, todas as tarefas pendentes de todos os meus projetos, ordenadas por prazo (mais urgente primeiro), para saber o que priorizar sem entrar projeto por projeto.
- Critério: tarefas sem prazo definido aparecem numa seção separada ("sem prazo"), nunca misturadas ordenadamente com as que têm prazo.
- Critério: tarefas com prazo vencido (data no passado, não concluídas) aparecem visualmente destacadas no topo da lista.
- Critério: a tela carrega em uma única chamada à API (não uma chamada por projeto).

### H3 — Kanban por projeto
Como usuário, quero ver e mover as tarefas de um projeto específico em colunas (A fazer / Em andamento / Concluído), para gerenciar o fluxo de trabalho daquele projeto isoladamente.
- Critério: mover uma tarefa de coluna atualiza o status no backend e reflete na visão central (H2) sem precisar recarregar a página manualmente.

### H4 — Quebra de meta em subtarefas via IA
Como usuário, quero digitar uma meta grande em texto livre (ex.: "escrever capítulo 3 do TCC até dia 20") associada a um projeto, e receber uma lista de subtarefas sugeridas com prazos estimados, para não ter que planejar do zero.
- Critério: a sugestão da IA é apresentada como uma lista editável antes de ser salva — o usuário pode remover, editar texto e prazo de cada subtarefa sugerida, ou descartar a sugestão inteira, antes de confirmar.
- Critério: nenhuma subtarefa é gravada no banco sem uma ação explícita de confirmação do usuário (botão "Adicionar ao projeto" ou similar).
- Critério: se a meta digitada não tiver prazo final mencionado, a IA pode sugerir subtarefas sem prazo — o sistema não obriga a IA a inventar uma data.
- Critério: se a chamada à IA falhar (erro de rede, resposta não interpretável), o usuário vê uma mensagem de erro clara e pode continuar usando o resto do sistema normalmente (criar tarefa manual, ver kanban, etc.) sem qualquer travamento.

### H5 — Concluir e editar tarefas
Como usuário, quero marcar uma tarefa como concluída e editar seu texto/prazo/projeto a qualquer momento.
- Critério: tarefa concluída some da visão central de pendências (H2) mas continua visível dentro do kanban do projeto na coluna "Concluído".

### H6 — Autenticação
Como usuário, quero fazer login para acessar meus próprios projetos e tarefas, e ter certeza de que ninguém mais vê meus dados.
- Critério: toda rota de projeto/tarefa exige usuário autenticado; tentativa sem autenticação retorna 401, nunca expõe dado de outro usuário.

## Requisitos não funcionais

- **Segurança**: chave de API do provedor de LLM fica apenas em variável de ambiente do backend, nunca no bundle do frontend nem em resposta de API.
- **Erros de IA não bloqueiam o fluxo principal** (ver H4) — este é um requisito de robustez, não só de UX.
- **Tempo de resposta**: a chamada à IA para quebrar meta em subtarefas pode demorar (chamada de LLM); a interface deve mostrar estado de carregamento e não travar o restante da tela enquanto espera.
- **Dados sensíveis**: descrição de projeto e de tarefa não passam por nenhum log de texto livre do backend em nível `INFO` ou superior.

## Casos extremos e condições de erro

- Meta enviada para a IA vazia ou só espaços → sistema rejeita antes de chamar a API de IA (validação no frontend/backend), não gasta uma chamada de LLM à toa.
- Resposta da IA vem em formato inesperado (não é a lista estruturada esperada) → backend trata como erro de IA (ver H4), não tenta "adivinhar" e salvar lixo como subtarefa.
- Usuário exclui um projeto que tem tarefas — comportamento: exclusão em cascata das tarefas daquele projeto, com uma confirmação explícita antes ("Este projeto tem N tarefas. Excluir mesmo assim?").
- Duas tarefas com o mesmo prazo exato → ordenação por prazo empata pela ordem de criação (mais antiga primeiro), sem necessidade de critério adicional.
- Prazo de tarefa no passado ao ser criada (não só ao vencer depois) → sistema permite (pode ser um registro retroativo), apenas destaca visualmente como atrasada.

## Fora de escopo (explícito)

- Multi-usuário colaborando no mesmo projeto.
- Notificação por e-mail, push ou integração com calendário externo (Google Calendar etc.).
- Anexar arquivos às tarefas.
- Relatórios/analytics de produtividade.

## Suposições em aberto (marcadas como perguntas, não fatos)

- Qual provedor de LLM será usado na chamada da H4 (API da Anthropic, OpenAI, outro)? — assumido neste plano: API da Anthropic (Claude), por ser o que o autor já usa; pode ser trocado sem impacto no restante da spec, já que é um detalhe de implementação isolado num único serviço no backend.
- O prazo sugerido pela IA é uma data absoluta ou um prazo relativo ("em 3 dias")? — assumido: data absoluta, calculada pelo backend a partir da data de criação da meta, para simplificar a interface.

## Checklist — pronta para virar plano?

- [x] Toda história tem critérios de aceitação observáveis, testáveis por outra pessoa sem perguntar nada.
- [x] Requisitos não funcionais de segurança e desempenho estão escritos.
- [x] Casos extremos e condições de erro estão listados explicitamente.
- [x] Nada aqui descreve como implementar — só o quê e por quê (o "como" fica no plan.md).
- [x] Nenhum requisito depende de conhecimento que só está na cabeça do autor.
- [x] Suposições em aberto marcadas como perguntas.
- [x] Entregável a outro desenvolvedor sem reunião de explicação.
