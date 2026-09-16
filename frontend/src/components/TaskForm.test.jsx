import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client.js";
import { makeProject, makeTask } from "../test/fixtures.js";
import TaskForm from "./TaskForm.jsx";

vi.mock("../api/client.js", () => ({ api: { createTask: vi.fn() } }));

const projects = [
  makeProject({ id: 1, name: "TCC" }),
  makeProject({ id: 2, name: "Cliente A" }),
];

beforeEach(() => {
  vi.mocked(api.createTask).mockReset();
});

describe("TaskForm", () => {
  it("lista os projetos no seletor (spec H1)", () => {
    render(<TaskForm projects={projects} onCreated={vi.fn()} />);

    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Projeto…", "TCC", "Cliente A"]);
  });

  it("valida título e projeto sem chamar a API", async () => {
    const user = userEvent.setup();
    render(<TaskForm projects={projects} onCreated={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(screen.getByText("Escreva o título da tarefa.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Título da nova tarefa"), "Revisar");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(screen.getByText("Escolha um projeto.")).toBeInTheDocument();

    expect(api.createTask).not.toHaveBeenCalled();
  });

  it("cria a tarefa e limpa o formulário", async () => {
    const user = userEvent.setup();
    const created = makeTask({ title: "Revisar" });
    api.createTask.mockResolvedValue(created);
    const onCreated = vi.fn();
    render(<TaskForm projects={projects} onCreated={onCreated} />);

    await user.type(
      screen.getByLabelText("Título da nova tarefa"),
      " Revisar ",
    );
    await user.selectOptions(screen.getByLabelText("Projeto"), "Cliente A");
    fireEvent.change(screen.getByLabelText("Prazo"), {
      target: { value: "2026-10-01" },
    });
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(api.createTask).toHaveBeenCalledWith({
      title: "Revisar",
      project: 2,
      due_date: "2026-10-01",
    });
    expect(screen.getByLabelText("Título da nova tarefa")).toHaveValue("");
  });

  it("no kanban usa o projeto fixo e esconde o seletor", async () => {
    const user = userEvent.setup();
    api.createTask.mockResolvedValue(makeTask());
    render(
      <TaskForm projects={projects} fixedProjectId={1} onCreated={vi.fn()} />,
    );

    expect(screen.queryByLabelText("Projeto")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Título da nova tarefa"), "Ler");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(api.createTask).toHaveBeenCalledWith({
      title: "Ler",
      project: 1,
      due_date: null,
    });
  });

  it("mostra o erro devolvido pela API", async () => {
    const user = userEvent.setup();
    api.createTask.mockRejectedValue(new Error("Projeto: Pk inválido."));
    render(
      <TaskForm projects={projects} fixedProjectId={1} onCreated={vi.fn()} />,
    );

    await user.type(screen.getByLabelText("Título da nova tarefa"), "Ler");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(
      await screen.findByText("Projeto: Pk inválido."),
    ).toBeInTheDocument();
  });
});
