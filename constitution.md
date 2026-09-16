# Constituição — Painel de Projetos

Princípios não negociáveis do projeto. Válidos para todas as fases seguintes (spec, plano, tarefas, implementação). Qualquer decisão de design que viole um destes princípios deve ser rejeitada ou a constituição deve ser alterada primeiro, explicitamente.

## Stack

- Backend: Django + Django REST Framework.
- Frontend: React (SPA consumindo a API REST).
- Banco de dados: SQLite em desenvolvimento; deve ser trocável para Postgres sem mudança de modelo (usar apenas recursos padrão do Django ORM).
- Nenhuma dependência nova (biblioteca, serviço externo) entra no projeto sem justificativa escrita no `plan.md`.

## Segurança e privacidade

- Toda rota da API exige autenticação, exceto login/registro. Não existe "modo anônimo".
- Nomes de clientes, contatos e qualquer dado de projeto real (ex.: nomes de empresas, e-mails de contato) nunca aparecem em logs de aplicação, nem em mensagens de erro devolvidas ao frontend.
- A chave de API do provedor de IA usada para quebrar metas em subtarefas nunca é exposta ao frontend — toda chamada à IA passa pelo backend.
- Senhas seguem o hashing padrão do Django; nenhuma senha ou token é armazenado em texto plano em lugar nenhum (banco, log, arquivo).

## Papel da IA no sistema

- A IA (chamada a um provedor de LLM) tem uma única responsabilidade no sistema: sugerir subtarefas e prazos a partir de uma meta descrita pelo usuário.
- A IA nunca cria, edita ou exclui uma tarefa diretamente no banco sem confirmação explícita do usuário na interface.
- Se a chamada à IA falhar ou retornar algo que não possa ser interpretado como lista de subtarefas, o sistema informa o erro ao usuário e não trava a criação manual de tarefas — a funcionalidade de IA é um complemento, nunca uma dependência obrigatória do fluxo principal.

## Padrões de código e teste

- Todo endpoint da API que cria, edita ou exclui dados (Project, Task) tem pelo menos um teste automatizado cobrindo o caminho feliz e um caso de erro esperado.
- Código formatado com `black` (backend) e `prettier` (frontend); sem exceção caso a caso.
- Migrations do Django versionadas no repositório; nenhuma migration é editada depois de mergeada — mudança de schema é sempre uma nova migration.

## Escopo de uso

- Sistema de usuário único por conta (não há colaboração multi-usuário em um mesmo projeto nesta versão). Multi-usuário é explicitamente fora de escopo — não deve ser "meio implementado".
- Notificação de prazo é feita apenas dentro da interface (in-app). E-mail, push ou integração com calendário externo são fora de escopo desta versão.

## Ponto de verificação

Antes de avançar de fase, qualquer princípio acima deve ser verificável (algo que se testa ou se observa no código), não apenas uma boa intenção. Um princípio que não pode ser checado em code review ou teste automatizado deve ser reescrito ou removido daqui.
