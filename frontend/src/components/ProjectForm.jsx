import { useState } from "react";
import { useProjects } from "../context/ProjectsContext.jsx";

const DEFAULT_COLOR = "#7B5AA6";

export default function ProjectForm() {
  const { createProject } = useProjects();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!open) {
    return (
      <button
        type="button"
        className="button secondary full"
        onClick={() => setOpen(true)}
      >
        + Novo projeto
      </button>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Dê um nome ao projeto.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createProject({ name: name.trim(), description, color });
      setName("");
      setDescription("");
      setColor(DEFAULT_COLOR);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack project-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Nome</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoFocus
        />
      </label>
      <label className="field">
        <span>Descrição curta</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={280}
        />
      </label>
      <label className="field inline">
        <span>Cor</span>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </label>
      {error && <p className="error-text">{error}</p>}
      <div className="row">
        <button type="submit" className="button" disabled={saving}>
          {saving ? "Salvando…" : "Criar"}
        </button>
        <button
          type="button"
          className="button-link"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
