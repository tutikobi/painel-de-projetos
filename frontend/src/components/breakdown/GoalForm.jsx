export default function GoalForm({
  projects,
  projectId,
  onProjectChange,
  goal,
  onGoalChange,
  loading,
  onSubmit,
  onCancel,
}) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label className="field">
        <span>Projeto</span>
        <select
          value={projectId}
          onChange={(e) => onProjectChange(e.target.value)}
          disabled={loading}
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
          onChange={(e) => onGoalChange(e.target.value)}
          disabled={loading}
        />
      </label>

      {loading ? (
        <div className="loading" role="status">
          <span className="spinner" aria-hidden="true" />
          <div>
            <p>Gerando sugestões… isso pode levar alguns segundos.</p>
            <p className="muted">
              Você pode continuar usando o painel enquanto espera.
            </p>
          </div>
          <button type="button" className="button-link" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      ) : (
        <button type="submit" className="button">
          Sugerir subtarefas
        </button>
      )}
    </form>
  );
}
