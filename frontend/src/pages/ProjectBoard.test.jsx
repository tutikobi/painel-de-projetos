import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client.js";
import { ProjectsProvider } from "../context/ProjectsContext.jsx";
import { makeProject, makeTask } from "../test/fixtures.js";
import ProjectBoard from "./ProjectBoard.jsx";

vi.mock("../api/client.js", () => ({
  api: {
    listProjects: vi.fn(),
    listTasks: vi.fn(),
    countProjectTasks: vi.fn(),
    deleteProject: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

function renderBoard(path = "/projects/1") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ProjectsProvider>
        <Routes>
          <Route path="/" element={<p>Pendências</p>} />
          <Route path="/projects/:id" element={<ProjectBoard />} />
        </Routes>
      </ProjectsProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  api.listProjects.mockResolvedValue([
    makeProject({ id: 1, name: "TCC", description: "Mestrado" }),
  ]);
  api.listTasks.mockResolvedValue([makeTask({ title: "Ler artigos" })]);
});

describe("ProjectBoard", () => {
  it("mostra o projeto e busca só as tarefas dele", async () => {
    renderBoard();

    expect(
      await screen.findByRole("heading", { name: "TCC" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mestrado")).toBeInTheDocument();
    expect(await screen.findByText("Ler artigos")).toBeInTheDocument();
    expect(api.listTasks).toHaveBeenCalledWith({ project: "1" });
  });

  it("avisa quando o projeto não existe", async () => {
    renderBoard("/projects/999");

    expect(
      await screen.findByText("Projeto não encontrado"),
    ).toBeInTheDocument();
  });

  it("exclui o projeto em duas etapas, citando quantas tarefas caem junto", async () => {
    const user = userEvent.setup();
    api.countProjectTasks.mockResolvedValue({ task_count: 2 });
    api.deleteProject.mockResolvedValue(null);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderBoard();

    await user.click(
      await screen.findByRole("button", { name: "Excluir projeto" }),
    );

    expect(confirm).toHaveBeenCalledWith(
      "Este projeto tem 2 tarefas. Excluir mesmo assim?",
    );
    await waitFor(() => expect(api.deleteProject).toHaveBeenCalledWith(1));
    expect(await screen.findByText("Pendências")).toBeInTheDocument();
  });

  it("não exclui o projeto se o usuário cancelar", async () => {
    const user = userEvent.setup();
    api.countProjectTasks.mockResolvedValue({ task_count: 2 });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderBoard();

    await user.click(
      await screen.findByRole("button", { name: "Excluir projeto" }),
    );

    expect(api.deleteProject).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "TCC" })).toBeInTheDocument();
  });
});
