import ColorDot from "./ColorDot.jsx";

export default function ProjectHeader({ project, onOpenBreakdown, onDelete }) {
  return (
    <header className="page-header">
      <div>
        <h1 className="with-dot">
          <ColorDot color={project.color} large />
          {project.name}
        </h1>
        {project.description && <p className="muted">{project.description}</p>}
      </div>
      <div className="row">
        <button
          type="button"
          className="button secondary"
          onClick={onOpenBreakdown}
        >
          Quebrar meta com IA
        </button>
        <button type="button" className="button-link danger" onClick={onDelete}>
          Excluir projeto
        </button>
      </div>
    </header>
  );
}
