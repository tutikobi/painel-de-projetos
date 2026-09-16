// Roteiro de aceitação no navegador (T3.1): percorre os critérios da spec
// na interface real. Requer backend (:8000) e frontend (:5173) rodando.
//
// Usa um navegador já instalado (sem download):
//   E2E_BROWSER_CHANNEL=msedge|chrome   (padrão: msedge no Windows, chrome nos demais)
//   E2E_BROWSER_PATH=/caminho/do/executavel   (alternativa ao canal)
//   E2E_BASE_URL=http://localhost:5173
//   E2E_HEADED=1   (abre a janela do navegador)
//   E2E_SCREENSHOTS=pasta   (salva capturas de tela)

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const SCREENSHOTS = process.env.E2E_SCREENSHOTS;
const PASSWORD = "Senha-forte-123";
const username = `e2e_${Date.now()}`;

function isoDaysFromToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
const toBr = (iso) => iso.split("-").reverse().join("/");

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function screenshot(page, name) {
  if (!SCREENSHOTS) return;
  mkdirSync(SCREENSHOTS, { recursive: true });
  await page.screenshot({
    path: join(SCREENSHOTS, `${name}.png`),
    fullPage: true,
  });
}

const launchOptions = { headless: !process.env.E2E_HEADED };
if (process.env.E2E_BROWSER_PATH) {
  launchOptions.executablePath = process.env.E2E_BROWSER_PATH;
} else {
  launchOptions.channel =
    process.env.E2E_BROWSER_CHANNEL ??
    (process.platform === "win32" ? "msedge" : "chrome");
}

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));
const dialogs = [];
page.on("dialog", async (dialog) => {
  dialogs.push(dialog.message());
  await dialog.accept();
});
const apiCalls = [];
page.on("request", (request) => {
  const url = new URL(request.url());
  if (url.pathname.startsWith("/api/")) {
    apiCalls.push(`${request.method()} ${url.pathname}${url.search}`);
  }
});

const taskForm = () => page.locator(".task-form");
const sidebarProject = (name) =>
  page.locator(".project-list").getByText(name, { exact: true });

async function login() {
  await page.getByLabel("Usuário").fill(username);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).last().click();
}

async function addTask(title, project, dueDate) {
  await taskForm().getByLabel("Título da nova tarefa").fill(title);
  if (project) {
    await taskForm()
      .getByLabel("Projeto", { exact: true })
      .selectOption({ label: project });
  }
  if (dueDate) {
    await taskForm().getByLabel("Prazo", { exact: true }).fill(dueDate);
  }
  await taskForm().getByRole("button", { name: "Adicionar" }).click();
  await page.locator(".task-title", { hasText: title }).first().waitFor();
}

async function dragCard(card, targetColumn) {
  const from = await card.boundingBox();
  const to = await targetColumn.boundingBox();
  const start = { x: from.x + 40, y: from.y + 15 };
  const end = { x: to.x + 60, y: to.y + 60 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let step = 1; step <= 25; step++) {
    await page.mouse.move(
      start.x + ((end.x - start.x) * step) / 25,
      start.y + ((end.y - start.y) * step) / 25,
    );
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

try {
  // H6 — acesso
  await page.goto(`${BASE}/`);
  await page.waitForURL("**/login");
  check("rota protegida redireciona para /login", true);

  await page.getByRole("tab", { name: "Criar conta" }).click();
  await page.getByLabel("Usuário").fill(username);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Criar conta" }).last().click();
  await page.getByRole("heading", { name: "Pendências" }).waitFor();
  check("cadastro entra direto na visão central", true);

  // H1 — projetos
  for (const name of ["Cliente A", "TCC"]) {
    await page.getByRole("button", { name: "+ Novo projeto" }).click();
    await page.getByLabel("Nome").fill(name);
    await page.getByLabel("Descrição curta").fill(`Descrição de ${name}`);
    await page.getByRole("button", { name: "Criar" }).click();
    await sidebarProject(name).waitFor();
  }
  const options = await taskForm()
    .getByLabel("Projeto", { exact: true })
    .locator("option")
    .allTextContents();
  check(
    "H1: projeto aparece na lista e no seletor sem recarregar",
    options.includes("Cliente A") && options.includes("TCC"),
  );

  // H2 — visão central
  const overdueDate = isoDaysFromToday(-5);
  await addTask("Tarefa futura", "TCC", isoDaysFromToday(10));
  await addTask("Tarefa sem prazo", "TCC");
  await addTask("Tarefa atrasada", "Cliente A", overdueDate);

  const headings = await page.locator(".section-title").allTextContents();
  check(
    "H2: seções Atrasadas / Com prazo / Sem prazo",
    headings.join("|") === "Atrasadas (1)|Com prazo (1)|Sem prazo (1)",
    headings.join(" | "),
  );
  const firstRow = page.locator(".task-row").first();
  check(
    "H2: atrasada no topo e destacada (prazo retroativo permitido)",
    (await firstRow.textContent()).includes("Tarefa atrasada") &&
      (await firstRow.getAttribute("class")).includes("overdue"),
  );
  await screenshot(page, "01-visao-central");

  const callsBeforeReload = apiCalls.length;
  await page.reload();
  await page.waitForURL("**/login");
  check("H6: F5 exige novo login (tokens só em memória)", true);
  await login();
  await page.locator(".task-row").first().waitFor();
  const listCalls = apiCalls
    .slice(callsBeforeReload)
    .filter((call) => call.startsWith("GET /api/tasks/"));
  // Em modo dev o StrictMode do React repete efeitos; nunca há chamada por projeto.
  check(
    "H2: uma chamada de listagem, nenhuma por projeto",
    new Set(listCalls).size === 1 && !listCalls[0].includes("project="),
    listCalls.join(", "),
  );

  // H5 — concluir e editar
  await page.getByLabel('Concluir "Tarefa futura"').click();
  await page
    .locator(".task-title", { hasText: "Tarefa futura" })
    .waitFor({ state: "detached" });
  check("H5: concluída some da visão central", true);

  const editedDate = isoDaysFromToday(60);
  await page.getByRole("button", { name: 'Editar "Tarefa sem prazo"' }).click();
  const editor = page.locator(".task-editor");
  await editor.getByLabel("Título", { exact: true }).fill("Tarefa editada");
  await editor
    .getByLabel("Projeto", { exact: true })
    .selectOption({ label: "Cliente A" });
  await editor.getByLabel("Prazo", { exact: true }).fill(editedDate);
  await editor.getByRole("button", { name: "Salvar" }).click();
  const editedRow = page.locator(".task-row", { hasText: "Tarefa editada" });
  await editedRow.waitFor();
  const editedText = await editedRow.textContent();
  check(
    "H5: edição de texto, prazo e projeto",
    editedText.includes("Cliente A") && editedText.includes(toBr(editedDate)),
  );

  // H3 — kanban
  await sidebarProject("TCC").click();
  const doneColumn = page.getByRole("region", { name: "Concluído" });
  await doneColumn.waitFor();
  check(
    "H5: concluída continua no kanban, em Concluído",
    (await doneColumn.textContent()).includes("Tarefa futura"),
  );

  const doingColumn = page.getByRole("region", { name: "Em andamento" });
  const patchResponse = page.waitForResponse(
    (r) => r.url().includes("/api/tasks/") && r.request().method() === "PATCH",
  );
  await dragCard(
    doneColumn.locator(".card", { hasText: "Tarefa futura" }),
    doingColumn,
  );
  await doingColumn.locator(".card", { hasText: "Tarefa futura" }).waitFor();
  check(
    "H3: arrastar card entre colunas grava no backend",
    (await patchResponse).ok(),
  );
  await screenshot(page, "02-kanban");

  await page.getByRole("link", { name: "Pendências" }).click();
  await page.locator(".task-title", { hasText: "Tarefa futura" }).waitFor();
  check("H3: mudança no kanban aparece na visão central sem recarregar", true);

  // H4 — IA: validação, falha e fluxo principal intacto
  await sidebarProject("TCC").click();
  await page.getByRole("button", { name: "Quebrar meta com IA" }).click();
  const panel = page.getByRole("dialog", { name: "Quebrar meta com IA" });
  const aiCallCount = () =>
    apiCalls.filter((c) => c.includes("/api/ai/")).length;

  const aiCallsBefore = aiCallCount();
  await panel.getByRole("button", { name: "Sugerir subtarefas" }).click();
  await panel.getByText("Descreva a meta antes de pedir sugestões.").waitFor();
  check("H4: meta vazia não chama a IA", aiCallCount() === aiCallsBefore);

  // Simula a falha da IA para o roteiro não depender de chave/rede.
  await page.route("**/api/ai/breakdown/", (route) =>
    route.fulfill({
      status: 502,
      json: { detail: "Não foi possível gerar sugestões agora." },
    }),
  );
  await panel.getByLabel("Meta").fill("escrever capítulo 3 do TCC até dia 20");
  await panel.getByRole("button", { name: "Sugerir subtarefas" }).click();
  const aiError = await panel.getByRole("alert").textContent();
  check(
    "H4: falha da IA mostra erro claro",
    aiError.includes("Não foi possível"),
    aiError,
  );

  await addTask("Manual com painel aberto");
  check("H4: criação manual segue funcionando com o painel aberto", true);
  await page.unroute("**/api/ai/breakdown/");

  // H4 — revisão e confirmação (sugestão simulada, confirmação real)
  const suggestedDate = isoDaysFromToday(2);
  await page.route("**/api/ai/breakdown/", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({
      json: {
        project_id: 0,
        suggestions: [
          { title: "Levantar referências", due_date: suggestedDate },
          { title: "Escrever rascunho", due_date: isoDaysFromToday(3) },
          { title: "Item para remover", due_date: null },
        ],
      },
    });
  });
  await panel.getByRole("button", { name: "Sugerir subtarefas" }).click();
  check(
    "NFR: estado de carregamento visível",
    (await panel.getByRole("status").textContent()).includes(
      "Gerando sugestões",
    ),
  );
  await panel.getByLabel("Título da subtarefa").first().waitFor();
  await screenshot(page, "03-revisao-ia");
  check(
    "H4: nada é gravado antes de confirmar",
    !apiCalls.some((call) => call.includes("/confirm/")),
  );

  const cardsBefore = await page.locator(".card").count();
  await panel.getByRole("button", { name: "Remover subtarefa" }).nth(2).click();
  await panel
    .getByLabel("Título da subtarefa")
    .first()
    .fill("Levantar referências (editado)");
  await panel.getByLabel("Prazo da subtarefa").nth(1).fill("");
  await panel.getByRole("button", { name: "Adicionar ao projeto" }).click();
  await panel.waitFor({ state: "detached" });
  await page
    .locator(".card", { hasText: "Levantar referências (editado)" })
    .waitFor();
  const aiCards = page.locator(".card", {
    has: page.locator(".badge", { hasText: /^IA$/ }),
  });
  check(
    "H4: grava só os itens revisados, marcados como IA",
    (await aiCards.count()) === 2 &&
      (await page.locator(".card").count()) === cardsBefore + 2 &&
      (await page
        .locator(".card", { hasText: "Item para remover" })
        .count()) === 0,
  );
  await page.unroute("**/api/ai/breakdown/");

  // Casos extremos — exclusão de projeto em duas etapas
  await sidebarProject("Cliente A").click();
  await page.getByRole("button", { name: "Excluir projeto" }).click();
  await page.waitForURL(`${BASE}/`);
  check(
    "Exclusão pede confirmação citando o número de tarefas",
    dialogs.includes("Este projeto tem 2 tarefas. Excluir mesmo assim?"),
    dialogs.join(" | "),
  );
  check(
    "Projeto excluído some da barra lateral",
    (await page.locator(".project-list").getByText("Cliente A").count()) === 0,
  );

  // Responsividade
  await page.setViewportSize({ width: 400, height: 800 });
  await screenshot(page, "04-celular");
  check(
    "Sem rolagem horizontal em 400 px",
    !(await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )),
  );
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/login");
  check("H6: sair volta para o login", true);
} catch (error) {
  check("roteiro executado até o fim", false, error.message.split("\n")[0]);
  await screenshot(page, "erro");
} finally {
  await browser.close();
}

// 401/502 são respostas esperadas do roteiro (sessão e IA simulada).
const unexpected = consoleErrors.filter((e) => !/status of (401|502)/.test(e));
check(
  "Sem erros inesperados no console",
  unexpected.length === 0,
  unexpected.join(" | "),
);

const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} verificações passaram.`,
);
process.exitCode = failed.length ? 1 : 0;
