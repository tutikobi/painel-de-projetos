import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client.js";
import { deferred, makeTask } from "../test/fixtures.js";
import { useTasks } from "./useTasks.js";

vi.mock("../api/client.js", () => ({
  api: { listTasks: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(api.listTasks).mockReset();
  vi.mocked(api.updateTask).mockReset();
  vi.mocked(api.deleteTask).mockReset();
});

describe("useTasks", () => {
  it("carrega as tarefas com os filtros informados", async () => {
    const task = makeTask();
    api.listTasks.mockResolvedValue([task]);

    const { result } = renderHook(() => useTasks({ project: 7 }));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tasks).toEqual([task]);
    expect(api.listTasks).toHaveBeenCalledWith({ project: "7" });
  });

  it("expõe o erro de carregamento", async () => {
    api.listTasks.mockRejectedValue(new Error("Sem conexão com o servidor."));

    const { result } = renderHook(() => useTasks({}));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Sem conexão com o servidor.");
  });

  it("descarta resposta atrasada de um filtro antigo", async () => {
    const slow = deferred();
    const fromProject1 = makeTask({ title: "do projeto 1" });
    const fromProject2 = makeTask({ title: "do projeto 2" });
    api.listTasks
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce([fromProject2]);

    const { result, rerender } = renderHook(
      ({ project }) => useTasks({ project }),
      { initialProps: { project: 1 } },
    );
    rerender({ project: 2 });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => slow.resolve([fromProject1]));

    expect(result.current.tasks).toEqual([fromProject2]);
  });

  it("atualização otimista é desfeita se a API falhar (spec H3)", async () => {
    const task = makeTask({ id: 5, status: "todo" });
    api.listTasks.mockResolvedValue([task]);
    const pending = deferred();
    api.updateTask.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useTasks({}));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let move;
    act(() => {
      move = result.current.updateTask(
        5,
        { status: "done" },
        { optimistic: true },
      );
    });
    expect(result.current.tasks[0].status).toBe("done");

    await act(async () => {
      pending.reject(new Error("falhou"));
      await expect(move).rejects.toThrow("falhou");
    });
    expect(result.current.tasks[0].status).toBe("todo");
  });

  it("substitui a tarefa pela versão devolvida pela API", async () => {
    api.listTasks.mockResolvedValue([makeTask({ id: 5, is_overdue: true })]);
    api.updateTask.mockResolvedValue(
      makeTask({ id: 5, status: "done", is_overdue: false }),
    );
    const { result } = renderHook(() => useTasks({}));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.updateTask(5, { status: "done" }));

    expect(result.current.tasks[0]).toMatchObject({
      status: "done",
      is_overdue: false,
    });
  });

  it("remove a tarefa da lista depois de excluir na API", async () => {
    api.listTasks.mockResolvedValue([makeTask({ id: 1 }), makeTask({ id: 2 })]);
    api.deleteTask.mockResolvedValue(null);
    const { result } = renderHook(() => useTasks({}));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.deleteTask(1));

    expect(api.deleteTask).toHaveBeenCalledWith(1);
    expect(result.current.tasks.map((t) => t.id)).toEqual([2]);
  });
});
