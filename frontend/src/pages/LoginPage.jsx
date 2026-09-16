import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (user) return <Navigate to="/" replace />;

  const isLogin = mode === "login";

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isLogin) await login(username, password);
      else await register(username, password);
      navigate(location.state?.from?.pathname ?? "/", { replace: true });
    } catch (err) {
      setError(
        isLogin && err.status === 401
          ? "Usuário ou senha incorretos."
          : err.message,
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card stack" onSubmit={handleSubmit}>
        <h1>Painel de Projetos</h1>
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={isLogin}
            className={isLogin ? "tab active" : "tab"}
            onClick={() => setMode("login")}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isLogin}
            className={!isLogin ? "tab active" : "tab"}
            onClick={() => setMode("register")}
          >
            Criar conta
          </button>
        </div>

        <label className="field">
          <span>Usuário</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
          />
        </label>
        {!isLogin && (
          <p className="muted small">
            Mínimo de 8 caracteres, não pode ser só números nem uma senha comum.
          </p>
        )}
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? "Aguarde…" : isLogin ? "Entrar" : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
