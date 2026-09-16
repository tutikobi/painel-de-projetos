import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client.js";
import { ProjectsProvider } from "../context/ProjectsContext.jsx";
import { makeProject, makeTask } from "../test/fixtures.js";
import CentralView from "./CentralView.jsx";

vi.mock("../api/client.js", () => ({
  api: {
    listProjects: vi.fn(),
    listTasks: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    createTask: vi.fn(),
  },
}));

function renderView() {
  render(
    <MemoryRouter>
      <ProjectsProvider>
        <CentralView />
      </ProjectsProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  api.listProjects.mockResolvedValue([makeProject()]);
});

describe("CentralView (spec H2)", () => {
  it("busca as pendências numa única chamada e agrupa por seção", async () => {
    api.listTasks.mockResolvedValue([
      makeTask({
        title: "Entregar relatório",
        due_date: "2026-09-01",
        is_overdue: true,
      }),
      makeTask({ title: "Próxima", due_date: "2026-09-30" }),
      makeTask({ title: "Sem data", due_date: null }),
    ]);

    renderView();

    const overdue = await screen.findByRole("region", { name: "Atrasadas" });
    expect(within(overdue).getByText("Entregar relatório")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Com prazo" })).getByText(
        "Próxima",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Sem prazo" })).getByText(
        "Sem data",
      ),
    ).toBeInTheDocument();
    expect(api.listTasks).toHaveBeenCalledOnce();
    expect(api.listTasks).toHaveBeenCalledWith({ status: "todo,doing" });

    const sections = screen
      .getAllByRole("region")
      .map((s) => s.getAttribute("aria-label"));
    expect(sections).toEqual(["Atrasadas", "Com prazo", "Sem prazo"]);
  });

  it("mostra estado vazio", async () => {
    api.listTasks.mockResolvedValue([]);

    renderView();

    expect(await screen.findByText(/Nenhuma pendência/)).toBeInTheDocument();
  });

  it("pede para criar projeto quando não há nenhum", async () => {
    api.listProjects.mockResolvedValue([]);
    api.listTasks.mockResolvedValue([]);

    renderView();

    expect(
      await screen.findByText(/Crie seu primeiro projeto/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Quebrar meta com IA" }),
    ).toBeDisabled();
  });

  it("tarefa concluída some da lista (spec H5)", async () => {
    const user = userEvent.setup();
    api.listTasks.mockResolvedValue([makeTask({ id: 9, title: "Entregar" })]);
    api.updateTask.mockResolvedValue(makeTask({ id: 9, status: "done" }));
    renderView();

    await user.click(await screen.findByLabelText('Concluir "Entregar"'));

    expect(screen.queryByText("Entregar")).not.toBeInTheDocument();
    expect(api.updateTask).toHaveBeenCalledWith(9, { status: "done" });
  });

  it("se concluir falhar, mostra o erro e recarrega a lista", async () => {
    const user = userEvent.setup();
    const task = makeTask({ id: 9, title: "Entregar" });
    api.listTasks.mockResolvedValue([task]);
    api.updateTask.mockRejectedValue(new Error("Sem conexão com o servidor."));
    renderView();

    await user.click(await screen.findByLabelText('Concluir "Entregar"'));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível concluir a tarefa: Sem conexão com o servidor.",
    );
    await waitFor(() =>
      expect(screen.getByText("Entregar")).toBeInTheDocument(),
    );
    expect(api.listTasks).toHaveBeenCalledTimes(2);
  });

  it("exclui tarefa só depois de confirmar", async () => {
    const user = userEvent.setup();
    api.listTasks.mockResolvedValue([makeTask({ id: 9, title: "Entregar" })]);
    api.deleteTask.mockResolvedValue(null);
    const confirm = vi.spyOn(window, "confirm");
    renderView();
    const deleteButton = await screen.findByRole("button", {
      name: 'Excluir "Entregar"',
    });

    confirm.mockReturnValueOnce(false);
    await user.click(deleteButton);
    expect(api.deleteTask).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    await user.click(deleteButton);
    await waitFor(() =>
      expect(screen.queryByText("Entregar")).not.toBeInTheDocument(),
    );
    expect(api.deleteTask).toHaveBeenCalledWith(9);
  });

  it("abre o painel de IA sem esconder a tela", async () => {
    const user = userEvent.setup();
    api.listTasks.mockResolvedValue([makeTask({ title: "Entregar" })]);
    renderView();

    await user.click(
      await screen.findByRole("button", { name: "Quebrar meta com IA" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Quebrar meta com IA" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Entregar")).toBeVisible();
  });
});
