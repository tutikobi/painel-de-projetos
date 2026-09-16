export default function TaskActions({ taskTitle, onEdit, onDelete }) {
  return (
    <div className="task-actions">
      <button
        type="button"
        className="button-link"
        aria-label={`Editar "${taskTitle}"`}
        onClick={onEdit}
      >
        Editar
      </button>
      <button
        type="button"
        className="button-link danger"
        aria-label={`Excluir "${taskTitle}"`}
        onClick={onDelete}
      >
        Excluir
      </button>
    </div>
  );
}
