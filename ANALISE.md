# Análise dos artefatos de intenção (T0.1–T0.4)

Revisão manual de `00_prompt-inicial.md`, `constitution.md`, `spec.md`, `plan.md` e `tasks.md`, feita antes e durante a implementação. O conteúdo original desses artefatos está no commit `docs: artefatos de intenção` da branch `main`. As correções decorrentes estão na branch de implementação e aparecem no diff.

**Veredito:** os artefatos estão bons o bastante para implementar sem reunião. A rastreabilidade ideia → spec → plano → tarefas é clara, e quase tudo pode ser verificado por teste. Os problemas encontrados são lacunas e inconsistências pontuais, não erros de direção. A tabela abaixo mostra cada um e o que foi feito.

## Do rascunho inicial para a spec

Todos os pontos do `00_prompt-inicial.md` viraram história, requisito não funcional ou item de "fora de escopo". Nada se perdeu no caminho. A spec acrescentou decisões que o rascunho não tinha: exclusão em cascata com confirmação, desempate por data de criação e prazo retroativo permitido.

## T0.2 — Constituição: cada princípio é verificável?

| Princípio | Verificável? | Como foi verificado |
|---|---|---|
| Stack Django/DRF + React; SQLite trocável por Postgres | Sim | Código usa só ORM padrão (`nulls_last` existe nos dois bancos) |
| Toda dependência justificada no `plan.md` | Sim, em revisão | **Falhava:** o plano não justificava `anthropic`, `pytest-django`, `black`, `prettier`, `vite`, `react-router-dom` nem o CORS da T1.1. Seção "Dependências" adicionada |
| Toda rota exige autenticação, exceto login/registro | Sim | Teste parametrizado cobrindo todas as rotas (401). **Conflito:** a renovação de JWT precisa ser acessível sem token de acesso. Constituição emendada |
| Dado de cliente nunca em log nem em erro ao frontend | Parcialmente | Testes com `caplog` para descrição de projeto e texto da meta. "Nunca" em todo o código só se garante por revisão |
| Chave de IA nunca no frontend | Sim | Chave lida só do ambiente no backend; o bundle não tem referência a ela |
| Senha com hash padrão; token nunca em texto plano "em lugar nenhum" | Sim, mas **ambíguo** | Teste confere o hash. "Em lugar nenhum" também vale para o navegador? Interpretado que sim: tokens só em memória (custo: F5 pede login) |
| IA só sugere; nada gravado sem confirmação | Sim | Teste confirma que `breakdown` não cria `Task` |
| Falha de IA não trava criação manual | Sim | Teste de API + roteiro no navegador |
| Todo endpoint que altera dados tem teste de sucesso e de erro | Sim | 89 testes |
| `black` / `prettier` sem exceção | Sim | `black --check .` e `prettier --check .` |
| Migrations versionadas e nunca editadas após merge | Sim, em revisão | `0001_initial.py` versionada |
| Usuário único; notificação só in-app | Sim | Não há modelo de compartilhamento; atraso é só destaque visual |

## T0.3 — Spec contra o checklist

O `tasks.md` fala em "checklist de 8 itens", mas a spec tem 7. O texto foi corrigido. Os 7 itens se sustentam, com estas ressalvas:

- **H6 sem critérios para o cadastro:** nome duplicado? regra de senha? Critérios adicionados.
- **H5 não trata segurança ao mover tarefa de projeto:** mover para projeto de outro usuário precisa ser rejeitado. Critério adicionado.
- **NFR de tempo de resposta sem número:** "pode demorar" não é testável. O plano agora fixa timeout de 60 s e cancelamento pela interface.
- **Casos extremos faltando:** meta longa demais, IA não configurada, atrasada que foi concluída. Adicionados.
- **"Nada descreve como implementar"** vale só em parte: "calculada pelo backend" e "nível `INFO`" são detalhes de implementação. Aceitável; mantido.
- **H2 "carrega em uma única chamada":** interpretado como "a lista de tarefas não faz uma chamada por projeto". A barra lateral de projetos é carregada à parte, uma vez por sessão.

## T0.4 — Plano: justificativas e referências

- Referência errada: exclusão em cascata apontava para "H2/casos extremos". O certo são só os casos extremos. Corrigido.
- Tabela de endpoints sem barra final no auth (`/api/auth/login`), diferente do resto e problemática para POST no Django. Corrigido, e incluídos `refresh` e `GET /projects/{id}/`.
- `?status=` aceitava um único valor, mas a H2 precisa de "todos menos concluídos". Agora aceita lista (`?status=todo,doing`).
- `DELETE ?confirm=false` retornando contagem é pouco convencional (um DELETE que não apaga), mas atende à spec e foi mantido como estava no plano.
- Frontend sem componentes para H1 (criar projeto) e H5 (editar/concluir), e o `tasks.md` também não tinha tarefas para isso. T2.7 e T2.8 adicionadas.
- "Modal" contradizia o NFR de não travar a tela enquanto a IA responde. Implementado como painel lateral não modal.
- Serviço de IA sem modelo, timeout ou estratégia de formato definidos. Detalhados.
