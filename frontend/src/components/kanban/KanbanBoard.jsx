import { DragDropContext } from "@hello-pangea/dnd";
import { TASK_STATUSES } from "../../constants/tasks.js";
import { dragResultToMove, groupTasksByStatus } from "../../utils/tasks.js";
import KanbanColumn from "./KanbanColumn.jsx";
import TaskCard from "./TaskCard.jsx";

// Kanban de um projeto (spec H3). Só traduz arrastes em `onMove`; quem
// persiste a mudança é a página.
export default function KanbanBoard({
  tasks,
  projects,
  onMove,
  onSave,
  onDelete,
}) {
  const tasksByStatus = groupTasksByStatus(tasks);

  function handleDragEnd(result) {
    const move = dragResultToMove(result);
    if (move) onMove(move.taskId, move.status);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="board">
        {TASK_STATUSES.map(({ value, label }) => (
          <KanbanColumn
            key={value}
            status={value}
            label={label}
            count={tasksByStatus[value].length}
          >
            {tasksByStatus[value].map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                projects={projects}
                onSave={onSave}
                onDelete={onDelete}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>
    </DragDropContext>
  );
}
