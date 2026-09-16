let lastId = 100;

export function makeProject(overrides = {}) {
  return {
    id: 1,
    name: "TCC",
    description: "",
    color: "#3366AA",
    created_at: "2026-09-01T10:00:00-03:00",
    task_count: 0,
    ...overrides,
  };
}

export function makeTask(overrides = {}) {
  const id = overrides.id ?? ++lastId;
  return {
    id,
    project: 1,
    project_name: "TCC",
    project_color: "#3366AA",
    title: `Tarefa ${id}`,
    status: "todo",
    due_date: null,
    created_at: "2026-09-01T10:00:00-03:00",
    source: "manual",
    is_overdue: false,
    ...overrides,
  };
}

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
