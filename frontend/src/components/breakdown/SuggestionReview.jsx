import { newEmptyItem } from "./suggestionItems.js";

export default function SuggestionReview({
  items,
  onItemsChange,
  saving,
  onConfirm,
  onDiscard,
}) {
  function updateItem(key, changes) {
    onItemsChange(
      items.map((item) => (item.key === key ? { ...item, ...changes } : item)),
    );
  }

  function removeItem(key) {
    onItemsChange(items.filter((item) => item.key !== key));
  }

  return (
    <div className="stack">
      <p className="muted">
        Revise antes de salvar: edite títulos e prazos ou remova o que não fizer
        sentido.
      </p>
      <ul className="suggestion-list">
        {items.map((item) => (
          <li key={item.key} className="suggestion">
            <input
              className="grow"
              aria-label="Título da subtarefa"
              value={item.title}
              maxLength={200}
              onChange={(e) => updateItem(item.key, { title: e.target.value })}
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
              onClick={() => removeItem(item.key)}
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
        onClick={() => onItemsChange([...items, newEmptyItem()])}
      >
        + Adicionar subtarefa
      </button>
      <div className="row">
        <button
          type="button"
          className="button"
          onClick={onConfirm}
          disabled={saving || items.length === 0}
        >
          {saving ? "Salvando…" : "Adicionar ao projeto"}
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={onDiscard}
          disabled={saving}
        >
          Descartar sugestão
        </button>
      </div>
    </div>
  );
}
