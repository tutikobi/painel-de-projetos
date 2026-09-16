import { useState } from "react";
import { Link } from "react-router-dom";
import { classNames } from "../utils/classNames.js";
import ColorDot from "./ColorDot.jsx";
import TaskActions from "./TaskActions.jsx";
import TaskEditor from "./TaskEditor.jsx";
import TaskMeta from "./TaskMeta.jsx";

// Linha de tarefa pendente na visão central (spec H2, H5).
export default function TaskRow({
  task,
  projects,
  onComplete,
  onSave,
  onDelete,
}) {
  const [editing, setEditing] = useState(false);

  async function save(changes) {
    await onSave(task, changes);
    setEditing(false);
  }

  return (
    <li className={classNames("task-row", task.is_overdue && "overdue")}>
      {editing ? (
        <TaskEditor
          task={task}
          projects={projects}
          onSave={save}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <input
            type="checkbox"
            aria-label={`Concluir "${task.title}"`}
            onChange={() => onComplete(task)}
          />
          <div className="task-main">
            <span className="task-title">{task.title}</span>
            <span className="task-sub">
              <Link to={`/projects/${task.project}`} className="project-tag">
                <ColorDot color={task.project_color} />
                {task.project_name}
              </Link>
              {task.status === "doing" && (
                <span className="badge">Em andamento</span>
              )}
              <TaskMeta task={task} />
            </span>
          </div>
          <TaskActions
            taskTitle={task.title}
            onEdit={() => setEditing(true)}
            onDelete={() => onDelete(task)}
          />
        </>
      )}
    </li>
  );
}
