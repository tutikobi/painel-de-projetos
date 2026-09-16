import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { classNames } from "../../utils/classNames.js";
import TaskActions from "../TaskActions.jsx";
import TaskEditor from "../TaskEditor.jsx";
import TaskMeta from "../TaskMeta.jsx";

export default function TaskCard({ task, index, projects, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);

  async function save(changes) {
    await onSave(task, changes);
    setEditing(false);
  }

  return (
    <Draggable
      draggableId={String(task.id)}
      index={index}
      isDragDisabled={editing}
    >
      {(provided, snapshot) => (
        <article
          className={classNames(
            "card",
            task.is_overdue && "overdue",
            snapshot.isDragging && "dragging",
          )}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          {editing ? (
            <TaskEditor
              task={task}
              projects={projects}
              onSave={save}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <p className="task-title">{task.title}</p>
              <TaskMeta task={task} />
              <TaskActions
                taskTitle={task.title}
                onEdit={() => setEditing(true)}
                onDelete={() => onDelete(task)}
              />
            </>
          )}
        </article>
      )}
    </Draggable>
  );
}
