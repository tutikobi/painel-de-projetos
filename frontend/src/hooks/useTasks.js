import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";

// Carrega uma lista de tarefas filtrada e oferece operações que mantêm a
// lista local em sincronia com a API.
export function useTasks(filters) {
  const query = new URLSearchParams(filters).toString();
  const [tasks, setTasks] = useState([]);
  const [loadedQuery, setLoadedQuery] = useState(null);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(
    () => api.listTasks(Object.fromEntries(new URLSearchParams(query))),
    [query],
  );

  useEffect(() => {
    // Descarta a resposta se o filtro mudar antes dela chegar
    // (ex.: troca rápida de projeto).
    let ignore = false;
    fetchTasks().then(
      (data) => {
        if (ignore) return;
        setTasks(data);
        setError(null);
        setLoadedQuery(query);
      },
      (err) => {
        if (ignore) return;
        setError(err.message);
        setLoadedQuery(query);
      },
    );
    return () => {
      ignore = true;
    };
  }, [fetchTasks, query]);

  const reload = useCallback(async () => {
    try {
      setTasks(await fetchTasks());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [fetchTasks]);

  const removeLocally = useCallback((id) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  }, []);

  const updateTask = useCallback(
    async (id, changes, { optimistic = false } = {}) => {
      const original = tasks.find((task) => task.id === id);
      const replace = (next) =>
        setTasks((current) =>
          current.map((task) => (task.id === id ? next : task)),
        );

      if (optimistic && original) replace({ ...original, ...changes });
      try {
        const updated = await api.updateTask(id, changes);
        replace(updated);
        return updated;
      } catch (err) {
        if (optimistic && original) replace(original);
        throw err;
      }
    },
    [tasks],
  );

  const deleteTask = useCallback(
    async (id) => {
      await api.deleteTask(id);
      removeLocally(id);
    },
    [removeLocally],
  );

  return {
    tasks,
    loading: loadedQuery !== query,
    error,
    setError,
    reload,
    removeLocally,
    updateTask,
    deleteTask,
  };
}
