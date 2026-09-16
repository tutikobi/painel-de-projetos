import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";
import { useEscapeKey } from "../hooks/useEscapeKey.js";
import ErrorAlert from "./ErrorAlert.jsx";
import GoalForm from "./breakdown/GoalForm.jsx";
import SuggestionReview from "./breakdown/SuggestionReview.jsx";
import {
  hasBlankTitle,
  toConfirmPayload,
  toEditableItems,
} from "./breakdown/suggestionItems.js";

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
  useEscapeKey(close);

  function close() {
    abortRef.current?.abort();
    onClose();
  }

  async function requestSuggestions() {
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
      setItems(toEditableItems(data.suggestions));
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

  function discardSuggestion() {
    setItems([]);
    setError(null);
    setStep("input");
  }

  async function confirm() {
    if (hasBlankTitle(items)) {
      setError("Preencha o título de todas as subtarefas ou remova as vazias.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await api.confirmSubtasks(
        Number(projectId),
        toConfirmPayload(items),
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

      {step === "review" ? (
        <SuggestionReview
          items={items}
          onItemsChange={setItems}
          saving={saving}
          onConfirm={confirm}
          onDiscard={discardSuggestion}
        />
      ) : (
        <GoalForm
          projects={projects}
          projectId={projectId}
          onProjectChange={setProjectId}
          goal={goal}
          onGoalChange={setGoal}
          loading={step === "loading"}
          onSubmit={requestSuggestions}
          onCancel={cancelRequest}
        />
      )}

      <ErrorAlert>{error}</ErrorAlert>
    </aside>
  );
}
