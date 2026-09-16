import { TASK_STATUSES } from "../constants/tasks.js";

// Seções da visão central (spec H2). A API já devolve as tarefas ordenadas
// por prazo; aqui elas só são separadas, mantendo essa ordem.
export function groupPendingTasks(tasks) {
  return {
    overdue: tasks.filter((task) => task.due_date && task.is_overdue),
    upcoming: tasks.filter((task) => task.due_date && !task.is_overdue),
    noDate: tasks.filter((task) => !task.due_date),
  };
}

export function groupTasksByStatus(tasks) {
  return Object.fromEntries(
    TASK_STATUSES.map(({ value }) => [
      value,
      tasks.filter((task) => task.status === value),
    ]),
  );
}

// Traduz o resultado do drag-and-drop em uma mudança de status, ou null
// quando o card foi solto fora de uma coluna ou na mesma coluna.
export function dragResultToMove({ source, destination, draggableId }) {
  if (!destination || destination.droppableId === source.droppableId) {
    return null;
  }
  return { taskId: Number(draggableId), status: destination.droppableId };
}

export function deleteProjectMessage(taskCount) {
  if (taskCount === 0) return "Excluir este projeto?";
  const noun = taskCount === 1 ? "tarefa" : "tarefas";
  return `Este projeto tem ${taskCount} ${noun}. Excluir mesmo assim?`;
}
