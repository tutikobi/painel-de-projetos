import { formatDate, relativeDueLabel } from "../utils/dates.js";

export default function TaskMeta({ task }) {
  return (
    <span className="task-meta">
      {task.due_date ? (
        <span title={relativeDueLabel(task.due_date)}>
          {formatDate(task.due_date)}
        </span>
      ) : (
        <span className="muted">sem prazo</span>
      )}
      {task.is_overdue && <span className="badge danger">Atrasada</span>}
      {task.source === "ai" && (
        <span className="badge" title="Criada a partir de sugestão de IA">
          IA
        </span>
      )}
    </span>
  );
}
