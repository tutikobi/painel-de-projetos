export const TASK_STATUSES = [
  { value: "todo", label: "A fazer" },
  { value: "doing", label: "Em andamento" },
  { value: "done", label: "Concluído" },
];

// Filtro da visão central (spec H2): tudo que ainda não foi concluído.
export const PENDING_FILTER = { status: "todo,doing" };
