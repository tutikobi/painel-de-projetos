import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, setTokens } from "../api/client.js";
import { AuthProvider } from "../context/AuthContext.jsx";
import LoginPage from "./LoginPage.jsx";

vi.mock("../api/client.js", () => ({
  api: { login: vi.fn(), register: vi.fn() },
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  setSessionExpiredHandler: vi.fn(),
}));

function renderLogin() {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Área logada</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function fillCredentials(
  user,
  username = "ana",
  password = "Senha-forte-123",
) {
  await user.type(screen.getByLabelText("Usuário"), username);
  await user.type(screen.getByLabelText("Senha"), password);
}

beforeEach(() => {
  vi.mocked(api.login).mockReset();
  vi.mocked(api.register).mockReset();
  vi.mocked(setTokens).mockReset();
});

describe("LoginPage (spec H6)", () => {
  it("entra e guarda os tokens em memória", async () => {
    const user = userEvent.setup();
    const tokens = { access: "a", refresh: "r" };
    api.login.mockResolvedValue(tokens);
    renderLogin();

    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Área logada")).toBeInTheDocument();
    expect(api.login).toHaveBeenCalledWith("ana", "Senha-forte-123");
    expect(setTokens).toHaveBeenCalledWith(tokens);
  });

  it("mensagem clara para senha errada", async () => {
    const user = userEvent.setup();
    api.login.mockRejectedValue(
      Object.assign(new Error("No active account"), { status: 401 }),
    );
    renderLogin();

    await fillCredentials(user, "ana", "errada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Usuário ou senha incorretos.",
    );
  });

  it("cria conta e já entra", async () => {
    const user = userEvent.setup();
    api.register.mockResolvedValue({ id: 1, username: "ana" });
    api.login.mockResolvedValue({ access: "a", refresh: "r" });
    renderLogin();

    await user.click(screen.getByRole("tab", { name: "Criar conta" }));
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("Área logada")).toBeInTheDocument();
    expect(api.register).toHaveBeenCalledWith("ana", "Senha-forte-123");
  });

  it("mostra a regra de senha que falhou no cadastro", async () => {
    const user = userEvent.setup();
    api.register.mockRejectedValue(
      Object.assign(new Error("Senha: Esta senha é muito comum."), {
        status: 400,
      }),
    );
    renderLogin();

    await user.click(screen.getByRole("tab", { name: "Criar conta" }));
    await fillCredentials(user, "ana", "12345678");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Senha: Esta senha é muito comum.",
    );
    expect(api.login).not.toHaveBeenCalled();
  });
});
