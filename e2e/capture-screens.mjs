// Gera as capturas de tela usadas em docs/apresentacao/.
//
// Pré-requisitos: backend e frontend rodando e dados de demonstração criados:
//   (backend) python manage.py seed_demo
//   (e2e)     npm run capturas
//
// As sugestões da IA são simuladas (exemplo ilustrativo); a tela de
// "chave não cadastrada" é real quando o servidor roda sem ANTHROPIC_API_KEY.
// Ao final, rode seed_demo de novo para desfazer a tarefa criada pela captura.

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "docs",
  "apresentacao",
  "img",
);
const USERNAME = process.env.DEMO_USERNAME ?? "demo";
const PASSWORD = process.env.DEMO_PASSWORD ?? "Painel-demo-2026";

function isoDaysFromToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

mkdirSync(OUT, { recursive: true });
const launchOptions = { headless: true };
if (process.env.E2E_BROWSER_PATH) {
  launchOptions.executablePath = process.env.E2E_BROWSER_PATH;
} else {
  launchOptions.channel =
    process.env.E2E_BROWSER_CHANNEL ??
    (process.platform === "win32" ? "msedge" : "chrome");
}

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const shot = (name) => page.screenshot({ path: join(OUT, `${name}.png`) });
const panel = page.getByRole("dialog", { name: "Quebrar meta com IA" });
const project = (name) =>
  page.locator(".project-list").getByText(name, { exact: true });

try {
  // Login e cadastro
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Usuário").fill(USERNAME);
  await page.getByLabel("Senha").fill(PASSWORD);
  await shot("01-login");

  await page.getByRole("tab", { name: "Criar conta" }).click();
  await page.getByLabel("Usuário").fill("ana");
  await page.getByLabel("Senha").fill("123");
  await page.getByRole("button", { name: "Criar conta" }).last().click();
  await page.getByRole("alert").waitFor();
  await shot("02-cadastro-senha-fraca");

  await page.getByRole("tab", { name: "Entrar" }).click();
  await page.getByLabel("Usuário").fill(USERNAME);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).last().click();
  await page.locator(".task-row").first().waitFor();

  // Visão central
  await shot("03-pendencias");

  await page.getByRole("button", { name: "+ Novo projeto" }).click();
  await page.getByLabel("Nome").fill("Curso de inglês");
  await page.getByLabel("Descrição curta").fill("Aulas às terças e quintas");
  await page
    .locator(".task-form")
    .getByLabel("Título da nova tarefa")
    .fill("Estudar para a prova oral");
  await shot("04-novo-projeto-e-tarefa");
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.locator(".task-form").getByLabel("Título da nova tarefa").fill("");

  await page
    .getByRole("button", {
      name: 'Editar "Separar ideias para trabalhos futuros"',
    })
    .click();
  await page
    .locator(".task-editor")
    .getByLabel("Prazo", { exact: true })
    .fill(isoDaysFromToday(20));
  await shot("05-editar-tarefa");
  await page
    .locator(".task-editor")
    .getByRole("button", { name: "Cancelar" })
    .click();

  // Kanban
  await project("TCC — Mestrado").click();
  await page.getByRole("region", { name: "Concluído" }).waitFor();
  await shot("06-kanban");

  // IA sem chave (servidor real)
  await page.getByRole("button", { name: "Quebrar meta com IA" }).click();
  await panel.getByRole("alert").waitFor();
  await shot("07-ia-sem-chave");
  await panel.getByRole("button", { name: "Fechar" }).click();

  // IA com chave (simulada para ilustrar)
  const deadline = isoDaysFromToday(14);
  const deadlineDay = Number(deadline.slice(8));
  await page.route("**/api/ai/status/", (route) =>
    route.fulfill({ json: { configured: true } }),
  );
  await page.route("**/api/ai/breakdown/", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.fulfill({
      json: {
        project_id: 0,
        suggestions: [
          ["Reler anotações e artigos do capítulo 2", 2],
          ["Definir estrutura e subseções do capítulo 3", 3],
          ["Escrever a seção 3.1 (fundamentação)", 6],
          ["Escrever a seção 3.2 (método proposto)", 9],
          ["Revisar texto, figuras e referências", 12],
          ["Enviar o capítulo 3 ao orientador", 14],
        ].map(([title, days]) => ({ title, due_date: isoDaysFromToday(days) })),
      },
    });
  });
  await page.getByRole("button", { name: "Quebrar meta com IA" }).click();
  await panel
    .getByLabel("Meta")
    .fill(`Escrever o capítulo 3 da dissertação até dia ${deadlineDay}`);
  await shot("08-ia-meta");
  await panel.getByRole("button", { name: "Sugerir subtarefas" }).click();
  await panel.getByRole("status").waitFor();
  await shot("09-ia-carregando");
  await panel.getByLabel("Título da subtarefa").first().waitFor();
  await shot("10-ia-revisao");

  await panel.getByRole("button", { name: "Remover subtarefa" }).nth(0).click();
  await panel.getByRole("button", { name: "Adicionar ao projeto" }).click();
  await panel.waitFor({ state: "detached" });
  await page.locator(".card", { hasText: "Enviar o capítulo 3" }).waitFor();
  await shot("11-ia-confirmado");

  // Celular
  await page.setViewportSize({ width: 400, height: 860 });
  await page.getByRole("link", { name: "Pendências" }).click();
  await page.locator(".task-row").first().waitFor();
  await page.evaluate(() =>
    document.querySelector(".content").scrollIntoView(),
  );
  await shot("12-celular");

  console.log(`Capturas salvas em ${OUT}`);
} finally {
  await browser.close();
}
