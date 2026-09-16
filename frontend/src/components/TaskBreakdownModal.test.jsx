import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client.js";
import { deferred, makeProject } from "../test/fixtures.js";
import TaskBreakdownModal from "./TaskBreakdownModal.jsx";

vi.mock("../api/client.js", () => ({
  api: {
    aiStatus: vi.fn(),
    suggestSubtasks: vi.fn(),
    confirmSubtasks: vi.fn(),
  },
}));

const projects = [
  makeProject({ id: 1, name: "TCC" }),
  makeProject({ id: 2, name: "Cliente A" }),
];

function renderPanel(props = {}) {
  const handlers = { onClose: vi.fn(), onConfirmed: vi.fn() };
  render(
    <TaskBreakdownModal
      projects={projects}
      initialProjectId={1}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

async function askForSuggestions(
  user,
  goal = "Escrever capítulo 3 até dia 20",
) {
  await user.type(screen.getByLabelText("Meta"), goal);
  await user.click(screen.getByRole("button", { name: "Sugerir subtarefas" }));
}

beforeEach(() => {
  vi.mocked(api.suggestSubtasks).mockReset();
  vi.mocked(api.confirmSubtasks).mockReset();
  vi.mocked(api.aiStatus).mockReset().mockResolvedValue({ configured: true });
});

describe("TaskBreakdownModal (spec H4)", () => {
  it("não chama a IA com meta vazia", async () => {
    const user = userEvent.setup();
    renderPanel();

    await askForSuggestions(user, "   ");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Descreva a meta antes de pedir sugestões.",
    );
    expect(api.suggestSubtasks).not.toHaveBeenCalled();
  });

  it("exige escolher o projeto quando não vem pré-selecionado", async () => {
    const user = userEvent.setup();
    renderPanel({ initialProjectId: undefined });

    await askForSuggestions(user);

    expect(screen.getByRole("alert")).toHaveTextContent("Escolha o projeto");
    expect(api.suggestSubtasks).not.toHaveBeenCalled();
  });

  it("mostra carregamento e permite cancelar a espera", async () => {
    const user = userEvent.setup();
    api.suggestSubtasks.mockReturnValue(deferred().promise);
    renderPanel();

    await askForSuggestions(user);

    expect(screen.getByRole("status")).toHaveTextContent("Gerando sugestões");
    const signal = api.suggestSubtasks.mock.calls[0][2];
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(signal.aborted).toBe(true);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("mostra o erro da IA e mantém a meta para tentar de novo", async () => {
    const user = userEvent.setup();
    api.suggestSubtasks.mockRejectedValue(
      new Error("Não foi possível gerar sugestões agora."),
    );
    renderPanel();

    await askForSuggestions(user, "Minha meta");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível gerar sugestões agora.",
    );
    expect(screen.getByLabelText("Meta")).toHaveValue("Minha meta");
    expect(api.confirmSubtasks).not.toHaveBeenCalled();
  });

  it("grava só o que foi revisado, depois da confirmação", async () => {
    const user = userEvent.setup();
    api.suggestSubtasks.mockResolvedValue({
      project_id: 1,
      suggestions: [
        { title: "Levantar referências", due_date: "2026-09-18" },
        { title: "Item a remover", due_date: null },
        { title: "Escrever rascunho", due_date: "2026-09-19" },
      ],
    });
    const created = [{ id: 10 }, { id: 11 }];
    api.confirmSubtasks.mockResolvedValue(created);
    const { onConfirmed, onClose } = renderPanel();

    await askForSuggestions(user, "  escrever capítulo 3  ");
    expect(api.suggestSubtasks).toHaveBeenCalledWith(
      1,
      "escrever capítulo 3",
      expect.any(AbortSignal),
    );

    const titles = await screen.findAllByLabelText("Título da subtarefa");
    expect(api.confirmSubtasks).not.toHaveBeenCalled();
    await user.clear(titles[0]);
    await user.type(titles[0], "Levantar referências (editado)");
    await user.click(
      screen.getAllByRole("button", { name: "Remover subtarefa" })[1],
    );
    fireEvent.change(screen.getAllByLabelText("Prazo da subtarefa")[1], {
      target: { value: "" },
    });
    await user.click(
      screen.getByRole("button", { name: "Adicionar ao projeto" }),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.confirmSubtasks).toHaveBeenCalledWith(1, [
      { title: "Levantar referências (editado)", due_date: "2026-09-18" },
      { title: "Escrever rascunho", due_date: null },
    ]);
    expect(onConfirmed).toHaveBeenCalledWith(created, 1);
  });

  it("não confirma com subtarefa sem título", async () => {
    const user = userEvent.setup();
    api.suggestSubtasks.mockResolvedValue({
      project_id: 1,
      suggestions: [{ title: "Ler", due_date: null }],
    });
    renderPanel();
    await askForSuggestions(user);
    await screen.findByLabelText("Título da subtarefa");

    await user.click(
      screen.getByRole("button", { name: "+ Adicionar subtarefa" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Adicionar ao projeto" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Preencha o título");
    expect(api.confirmSubtasks).not.toHaveBeenCalled();
  });

  it("descartar a sugestão volta para a meta sem gravar", async () => {
    const user = userEvent.setup();
    api.suggestSubtasks.mockResolvedValue({
      project_id: 1,
      suggestions: [{ title: "Ler", due_date: null }],
    });
    renderPanel();
    await askForSuggestions(user);
    await screen.findByLabelText("Título da subtarefa");

    await user.click(
      screen.getByRole("button", { name: "Descartar sugestão" }),
    );

    expect(screen.getByLabelText("Meta")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Título da subtarefa"),
    ).not.toBeInTheDocument();
    expect(api.confirmSubtasks).not.toHaveBeenCalled();
  });

  it("fecha com Esc ou no botão de fechar", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPanel();

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  describe("sem chave da API do Claude", () => {
    it("avisa ao abrir e não deixa pedir sugestões", async () => {
      const user = userEvent.setup();
      api.aiStatus.mockResolvedValue({ configured: false });
      renderPanel();

      const warning = await screen.findByRole("alert");
      expect(warning).toHaveTextContent(
        "Chave da API do Claude não cadastrada",
      );
      expect(warning).toHaveTextContent(
        "Por isso não é possível executar esta ação de IA.",
      );
      const submit = screen.getByRole("button", { name: "Sugerir subtarefas" });
      expect(submit).toBeDisabled();

      await user.type(screen.getByLabelText("Meta"), "Escrever capítulo 3");
      await user.click(submit);
      expect(api.suggestSubtasks).not.toHaveBeenCalled();
    });

    it("mostra o mesmo aviso se a API responder que a chave sumiu", async () => {
      const user = userEvent.setup();
      api.suggestSubtasks.mockRejectedValue(
        Object.assign(new Error("Chave da API do Claude não cadastrada..."), {
          status: 503,
          data: { code: "ai_not_configured" },
        }),
      );
      renderPanel();

      await askForSuggestions(user);

      const warning = await screen.findByRole("alert");
      expect(warning).toHaveTextContent(
        "Chave da API do Claude não cadastrada",
      );
      expect(screen.getAllByRole("alert")).toHaveLength(1);
      expect(
        screen.getByRole("button", { name: "Sugerir subtarefas" }),
      ).toBeDisabled();
    });

    it("não bloqueia se a consulta de status falhar", async () => {
      const user = userEvent.setup();
      api.aiStatus.mockRejectedValue(new Error("Sem conexão com o servidor."));
      api.suggestSubtasks.mockReturnValue(new Promise(() => {}));
      renderPanel();

      await askForSuggestions(user);

      expect(api.suggestSubtasks).toHaveBeenCalled();
    });
  });
});
