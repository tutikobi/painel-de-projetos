import { useState } from "react";
import { api } from "../api/client.js";

// Criação manual de tarefa. Com `fixedProjectId` (kanban) o seletor some;
// sem ele (visão central) o usuário escolhe o projeto (spec H1).
export default function TaskForm({ projects, fixedProjectId, onCreated }) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const selectedProject = fixedProjectId ?? Number(projectId);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Escreva o título da tarefa.");
      return;
    }
    if (!selectedProject) {
      setError("Escolha um projeto.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const task = await api.createTask({
        title: title.trim(),
        project: selectedProject,
        due_date: dueDate || null,
      });
      setTitle("");
      setDueDate("");
      onCreated(task);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        className="grow"
        placeholder="Nova tarefa…"
        aria-label="Título da nova tarefa"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
      />
      {fixedProjectId == null && (
        <select
          aria-label="Projeto"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">Projeto…</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      )}
      <input
        type="date"
        aria-label="Prazo"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <button type="submit" className="button" disabled={saving}>
        {saving ? "Adicionando…" : "Adicionar"}
      </button>
      {error && <p className="error-text full-row">{error}</p>}
    </form>
  );
}
