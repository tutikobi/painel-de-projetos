import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  api,
  ApiError,
  apiRequest,
  clearTokens,
  setSessionExpiredHandler,
  setTokens,
} from "./client.js";

function jsonResponse(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  clearTokens();
  setSessionExpiredHandler(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const authHeader = (call) => call[1].headers.Authorization;

describe("apiRequest", () => {
  it("envia o token de acesso e devolve o JSON", async () => {
    setTokens({ access: "a1", refresh: "r1" });
    fetchMock.mockResolvedValue(jsonResponse(200, [{ id: 1 }]));

    const data = await api.listTasks({ status: "todo,doing" });

    expect(data).toEqual([{ id: 1 }]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/tasks/?status=todo%2Cdoing");
    expect(options.headers.Authorization).toBe("Bearer a1");
  });

  it("renova o token após 401 e repete a requisição", async () => {
    setTokens({ access: "velho", refresh: "r1" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: "expirado" }))
      .mockResolvedValueOnce(jsonResponse(200, { access: "novo" }))
      .mockResolvedValueOnce(jsonResponse(200, []));

    await expect(api.listProjects()).resolves.toEqual([]);

    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/refresh/");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      refresh: "r1",
    });
    expect(authHeader(fetchMock.mock.calls[2])).toBe("Bearer novo");
  });

  it("encerra a sessão quando a renovação falha", async () => {
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    setTokens({ access: "velho", refresh: "r1" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { detail: "expirado" }))
      .mockResolvedValueOnce(jsonResponse(401, { detail: "refresh inválido" }));

    await expect(api.listProjects()).rejects.toMatchObject({ status: 401 });

    expect(onExpired).toHaveBeenCalledOnce();
    fetchMock.mockResolvedValueOnce(jsonResponse(401, {}));
    await api.listProjects().catch(() => {});
    expect(authHeader(fetchMock.mock.calls[2])).toBeUndefined();
  });

  it("compartilha uma única renovação entre requisições simultâneas", async () => {
    setTokens({ access: "velho", refresh: "r1" });
    fetchMock.mockImplementation(async (url, options) => {
      if (url === "/api/auth/refresh/")
        return jsonResponse(200, { access: "novo" });
      return options.headers.Authorization === "Bearer novo"
        ? jsonResponse(200, [])
        : jsonResponse(401, {});
    });

    await Promise.all([api.listProjects(), api.listTasks()]);

    const refreshCalls = fetchMock.mock.calls.filter(
      ([url]) => url === "/api/auth/refresh/",
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("não tenta renovar token no login", async () => {
    setTokens({ access: null, refresh: "r1" });
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: "Credenciais" }));

    await expect(api.login("ana", "errada")).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("expõe o corpo do erro para códigos específicos", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(503, {
        detail: "Chave não cadastrada",
        code: "ai_not_configured",
      }),
    );

    await expect(api.suggestSubtasks(1, "meta")).rejects.toMatchObject({
      status: 503,
      message: "Chave não cadastrada",
      data: { code: "ai_not_configured" },
    });
  });

  it("devolve null em 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(api.deleteTask(3)).resolves.toBeNull();
  });

  it("transforma falha de rede em ApiError legível", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiRequest("/tasks/")).rejects.toMatchObject({
      status: 0,
      message: "Sem conexão com o servidor.",
    });
  });

  it("repassa o cancelamento sem convertê-lo em erro da API", async () => {
    fetchMock.mockRejectedValue(new DOMException("aborted", "AbortError"));

    await expect(apiRequest("/ai/breakdown/")).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});

describe("mensagens de erro", () => {
  it.each([
    [
      502,
      { detail: "Não foi possível gerar sugestões agora." },
      "Não foi possível gerar sugestões agora.",
    ],
    [
      400,
      { title: ["Este campo não pode ser em branco."] },
      "Título: Este campo não pode ser em branco.",
    ],
    [
      400,
      { tasks: [{}, { title: ["Muito longo."] }] },
      "Subtarefas: Muito longo.",
    ],
    [400, { non_field_errors: ["Inválido."] }, "Inválido."],
    [
      500,
      undefined,
      "O servidor não respondeu como esperado. Tente novamente.",
    ],
    [404, undefined, "Não foi possível concluir a ação."],
  ])("HTTP %i", async (status, body, message) => {
    fetchMock.mockResolvedValue(jsonResponse(status, body));

    await expect(apiRequest("/tasks/", { auth: false })).rejects.toMatchObject({
      status,
      message,
    });
  });
});
