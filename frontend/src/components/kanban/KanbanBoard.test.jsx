import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeProject, makeTask } from "../../test/fixtures.js";
import KanbanBoard from "./KanbanBoard.jsx";

describe("KanbanBoard (spec H3)", () => {
  it("distribui as tarefas nas três colunas", () => {
    render(
      <KanbanBoard
        tasks={[
          makeTask({ title: "Ler", status: "todo" }),
          makeTask({ title: "Escrever", status: "doing" }),
          makeTask({ title: "Entregue", status: "done", source: "ai" }),
          makeTask({ title: "Revisar", status: "todo" }),
        ]}
        projects={[makeProject()]}
        onMove={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const column = (name) => within(screen.getByRole("region", { name }));
    expect(column("A fazer").getByText("Ler")).toBeInTheDocument();
    expect(column("A fazer").getByText("Revisar")).toBeInTheDocument();
    expect(column("A fazer").getByText("2")).toBeInTheDocument();
    expect(column("Em andamento").getByText("Escrever")).toBeInTheDocument();
    expect(column("Concluído").getByText("Entregue")).toBeInTheDocument();
    expect(column("Concluído").getByText("IA")).toBeInTheDocument();
  });

  it("repassa a exclusão com a tarefa clicada", () => {
    const onDelete = vi.fn();
    const task = makeTask({ title: "Ler" });
    render(
      <KanbanBoard
        tasks={[task]}
        projects={[makeProject()]}
        onMove={vi.fn()}
        onSave={vi.fn()}
        onDelete={onDelete}
      />,
    );

    screen.getByRole("button", { name: 'Excluir "Ler"' }).click();

    expect(onDelete).toHaveBeenCalledWith(task);
  });
});
