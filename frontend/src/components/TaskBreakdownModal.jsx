import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";

let nextKey = 0;
const withKey = (item) => ({ ...item, key: ++nextKey });

// Painel lateral (spec H4). Não bloqueia a tela: sem fundo modal, então o
// usuário continua usando o painel enquanto a IA responde (spec: NFR de tempo
// de resposta). Nada é gravado até "Adicionar ao projeto".
export default function TaskBreakdownModal({
  projects,
  initialProjectId,
  onClose,
  onConfirmed,
}) {
  const [projectId, setProjectId] = useState(
    initialProjectId ? String(initialProjectId) : "",
  );
  const [goal, setGoal] = useState("");
  const [step, setStep] = useState("input"); // input | loading | review
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function close() {
    abortRef.current?.abort();
    onClose();
  }

  async function requestSuggestions(event) {
    event.preventDefault();
    if (!Number(projectId)) {
      setError("Escolha o projeto da meta.");
      return;
    }
    // Meta vazia não gasta chamada de IA (spec: casos extremos).
    if (!goal.trim()) {
      setError("Descreva a meta antes de pedir sugestões.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setStep("loading");
    try {
      const data = await api.suggestSubtasks(
        Number(projectId),
        goal.trim(),
        controller.signal,
      );
      setItems(data.suggestions.map(withKey));
      setStep("review");
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message);
      setStep("input");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function cancelRequest() {
    abortRef.current?.abort();
    setStep("input");
  }

  function updateItem(key, changes) {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, ...changes } : item,
      ),
    );
  }

  function discardSuggestion() {
    setItems([]);
    setError(null);
    setStep("input");
  }

  async function confirm() {
    if (items.some((item) => !item.title.trim())) {
      setError("Preencha o título de todas as subtarefas ou remova as vazias.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await api.confirmSubtasks(
        Number(projectId),
        items.map((item) => ({
          title: item.title.trim(),
          due_date: item.due_date || null,
        })),
      );
      onConfirmed(created, Number(projectId));
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <aside
      className="side-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="breakdown-title"
    >
      <header className="side-panel-header">
        <h2 id="breakdown-title">Quebrar meta com IA</h2>
        <button
          type="button"
          className="button-link"
          onClick={close}
          aria-label="Fechar"
        >
          ✕
        </button>
      </header>

      {step !== "review" && (
        <form className="stack" onSubmit={requestSuggestions}>
          <label className="field">
            <span>Projeto</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={step === "loading"}
            >
              <option value="">Escolha…</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Meta</span>
            <textarea
              rows={4}
              maxLength={1000}
              placeholder='Ex.: "escrever capítulo 3 do TCC até dia 20"'
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={step === "loading"}
            />
          </label>

          {step === "loading" ? (
            <div className="loading" role="status">
              <span className="spinner" aria-hidden="true" />
              <div>
                <p>Gerando sugestões… isso pode levar alguns segundos.</p>
                <p className="muted">
                  Você pode continuar usando o painel enquanto espera.
                </p>
              </div>
              <button
                type="button"
                className="button-link"
                onClick={cancelRequest}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button type="submit" className="button">
              Sugerir subtarefas
            </button>
          )}
        </form>
      )}

      {step === "review" && (
        <div className="stack">
          <p className="muted">
            Revise antes de salvar: edite títulos e prazos ou remova o que não
            fizer sentido.
          </p>
          <ul className="suggestion-list">
            {items.map((item) => (
              <li key={item.key} className="suggestion">
                <input
                  className="grow"
                  aria-label="Título da subtarefa"
                  value={item.title}
                  maxLength={200}
                  onChange={(e) =>
                    updateItem(item.key, { title: e.target.value })
                  }
                />
                <input
                  type="date"
                  aria-label="Prazo da subtarefa"
                  value={item.due_date ?? ""}
                  onChange={(e) =>
                    updateItem(item.key, { due_date: e.target.value || null })
                  }
                />
                <button
                  type="button"
                  className="button-link danger"
                  aria-label="Remover subtarefa"
                  onClick={() =>
                    setItems((current) =>
                      current.filter((i) => i.key !== item.key),
                    )
                  }
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
          {items.length === 0 && (
            <p className="muted">Todas as sugestões foram removidas.</p>
          )}
          <button
            type="button"
            className="button-link"
            onClick={() =>
              setItems((current) => [
                ...current,
                withKey({ title: "", due_date: null }),
              ])
            }
          >
            + Adicionar subtarefa
          </button>
          <div className="row">
            <button
              type="button"
              className="button"
              onClick={confirm}
              disabled={saving || items.length === 0}
            >
              {saving ? "Salvando…" : "Adicionar ao projeto"}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={discardSuggestion}
              disabled={saving}
            >
              Descartar sugestão
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
    </aside>
  );
}
