# Ideia inicial — Painel de Projetos

(rascunho que eu escrevi antes de virar constitution/spec/plan/tasks, só pra não esquecer os pontos)

## O problema

Tô com vários projetos/clientes rodando ao mesmo tempo (freelas + o mestrado/artigos) e não tenho
uma visão única do que tá pendente em cada um. Fica tudo espalhado — memória, chat, e-mail —
e às vezes eu só lembro que tinha prazo quando já tá em cima. Queria uma ferramenta simples
que resolvesse isso.

## O que eu queria que desse pra fazer

- Cadastrar cada projeto/cliente que eu tô tocando (nome, uma cor pra identificar visualmente).
- Ter uma tela única que mostra TODAS as tarefas pendentes de todos os projetos juntas,
  ordenadas por prazo — pra eu saber o que priorizar sem entrar projeto por projeto.
- Dentro de cada projeto, um kanban simples (a fazer / fazendo / feito) pra organizar o fluxo.
- O diferencial: eu digito uma meta grande tipo "escrever capítulo 3 do artigo até dia 20" e a
  IA quebra isso em tarefas menores com prazo sugerido — porque a maior dificuldade não é
  fazer, é organizar por onde começar.
- Óbvio que a IA não pode simplesmente inventar e salvar tarefa sozinha — quero poder editar/
  remover a sugestão antes de confirmar. E se a chamada de IA falhar, não pode travar o resto
  do app, eu quero continuar usando normal (criar tarefa na mão, etc.).
- Login básico, só pra separar meus dados (não precisa ser multiusuário colaborativo, é uso
  pessoal mesmo).
- Sem notificação por e-mail/push por enquanto, só dentro do próprio app.

## Sobre a stack

Quero usar Django REST Framework no backend e React no frontend, que é o que eu já uso no
JobConvo — não quero aprender stack nova pro trabalho da disciplina, quero focar no problema
em si.

## Preocupação extra

Como parte disso pode envolver dado de projeto/cliente real, não quero nada sensível (nome de
cliente, etc.) vazando em log. E a chave de API da IA não pode aparecer no frontend de jeito
nenhum.

## O que eu não preciso agora

- Multiusuário / colaboração.
- Anexar arquivo em tarefa.
- Relatório/analytics de produtividade.
- Integração com Google Calendar ou isso.

---

*(a partir daqui foi que eu mandei pro Claude, para separar e por .md — virou constitution.md, spec.md, plan.md e tasks.md)*
