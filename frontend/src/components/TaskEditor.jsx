import { useState } from "react";

// Edição de texto, prazo e projeto de uma tarefa (spec H5).
export default function TaskEditor({ task, projects, onSave, onCancel }) {
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [projectId, setProjectId] = useState(String(task.project));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!title.trim()) {
      setError("O título não pode ficar vazio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        due_date: dueDate || null,
        project: Number(projectId),
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="task-editor" onSubmit={handleSubmit}>
      <input
        className="grow"
        aria-label="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        autoFocus
      />
      <input
        type="date"
        aria-label="Prazo"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <select
        aria-label="Projeto"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <div className="row">
        <button type="submit" className="button" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" className="button-link" onClick={onCancel}>
          Cancelar
        </button>
      </div>
      {error && <p className="error-text full-row">{error}</p>}
    </form>
  );
}
