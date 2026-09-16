import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { makeProject, makeTask } from "../test/fixtures.js";
import TaskRow from "./TaskRow.jsx";

const projects = [
  makeProject({ id: 1, name: "TCC" }),
  makeProject({ id: 2, name: "Cliente A" }),
];

function renderRow(task, handlers = {}) {
  const props = {
    onComplete: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn(),
    ...handlers,
  };
  render(
    <MemoryRouter>
      <ul>
        <TaskRow task={task} projects={projects} {...props} />
      </ul>
    </MemoryRouter>,
  );
  return props;
}

describe("TaskRow", () => {
  it("destaca tarefa atrasada e mostra o projeto com link", () => {
    renderRow(
      makeTask({ title: "Entregar", due_date: "2026-09-01", is_overdue: true }),
    );

    expect(screen.getByRole("listitem")).toHaveClass("overdue");
    expect(screen.getByText("Atrasada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "TCC" })).toHaveAttribute(
      "href",
      "/projects/1",
    );
  });

  it("marca a tarefa como concluída (spec H5)", async () => {
    const user = userEvent.setup();
    const task = makeTask({ title: "Entregar" });
    const { onComplete } = renderRow(task);

    await user.click(screen.getByLabelText('Concluir "Entregar"'));

    expect(onComplete).toHaveBeenCalledWith(task);
  });

  it("edita texto, prazo e projeto (spec H5)", async () => {
    const user = userEvent.setup();
    const task = makeTask({ title: "Rascunho", project: 1 });
    const { onSave } = renderRow(task);

    await user.click(screen.getByRole("button", { name: 'Editar "Rascunho"' }));
    await user.clear(screen.getByLabelText("Título"));
    await user.type(screen.getByLabelText("Título"), "Versão final");
    fireEvent.change(screen.getByLabelText("Prazo"), {
      target: { value: "2026-12-01" },
    });
    await user.selectOptions(screen.getByLabelText("Projeto"), "Cliente A");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onSave).toHaveBeenCalledWith(task, {
      title: "Versão final",
      due_date: "2026-12-01",
      project: 2,
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Salvar" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("mantém o editor aberto e mostra o erro se salvar falhar", async () => {
    const user = userEvent.setup();
    renderRow(makeTask({ title: "Rascunho" }), {
      onSave: vi.fn().mockRejectedValue(new Error("Título: Muito longo.")),
    });

    await user.click(screen.getByRole("button", { name: 'Editar "Rascunho"' }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Título: Muito longo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("não salva título vazio", async () => {
    const user = userEvent.setup();
    const { onSave } = renderRow(makeTask({ title: "Rascunho" }));

    await user.click(screen.getByRole("button", { name: 'Editar "Rascunho"' }));
    await user.clear(screen.getByLabelText("Título"));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      screen.getByText("O título não pode ficar vazio."),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
