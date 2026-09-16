import { describe, expect, it } from "vitest";
import { makeTask } from "../test/fixtures.js";
import {
  deleteProjectMessage,
  dragResultToMove,
  groupPendingTasks,
  groupTasksByStatus,
} from "./tasks.js";

describe("groupPendingTasks (spec H2)", () => {
  it("separa atrasadas, com prazo e sem prazo mantendo a ordem da API", () => {
    const late = makeTask({ due_date: "2026-09-01", is_overdue: true });
    const soon = makeTask({ due_date: "2026-09-20" });
    const later = makeTask({ due_date: "2026-10-01" });
    const undated = makeTask({ due_date: null });

    const groups = groupPendingTasks([late, soon, later, undated]);

    expect(groups.overdue).toEqual([late]);
    expect(groups.upcoming).toEqual([soon, later]);
    expect(groups.noDate).toEqual([undated]);
  });

  it("nunca mistura tarefa sem prazo com as que têm prazo", () => {
    const groups = groupPendingTasks([makeTask({ due_date: null })]);

    expect(groups.overdue).toHaveLength(0);
    expect(groups.upcoming).toHaveLength(0);
    expect(groups.noDate).toHaveLength(1);
  });
});

describe("groupTasksByStatus (spec H3)", () => {
  it("cria as três colunas, mesmo vazias", () => {
    const doing = makeTask({ status: "doing" });

    expect(groupTasksByStatus([doing])).toEqual({
      todo: [],
      doing: [doing],
      done: [],
    });
  });
});

describe("dragResultToMove", () => {
  const source = { droppableId: "todo", index: 0 };

  it("traduz arraste entre colunas em mudança de status", () => {
    expect(
      dragResultToMove({
        source,
        destination: { droppableId: "done", index: 0 },
        draggableId: "42",
      }),
    ).toEqual({ taskId: 42, status: "done" });
  });

  it("ignora soltar na mesma coluna ou fora do quadro", () => {
    expect(
      dragResultToMove({
        source,
        destination: { droppableId: "todo", index: 2 },
        draggableId: "42",
      }),
    ).toBeNull();
    expect(
      dragResultToMove({ source, destination: null, draggableId: "42" }),
    ).toBeNull();
  });
});

describe("deleteProjectMessage (spec: casos extremos)", () => {
  it.each([
    [0, "Excluir este projeto?"],
    [1, "Este projeto tem 1 tarefa. Excluir mesmo assim?"],
    [3, "Este projeto tem 3 tarefas. Excluir mesmo assim?"],
  ])("%i tarefas", (count, message) => {
    expect(deleteProjectMessage(count)).toBe(message);
  });
});
