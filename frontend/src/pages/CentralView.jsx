import { useState } from "react";
import { api } from "../api/client.js";
import { PENDING_FILTER } from "../constants/tasks.js";
import { useProjects } from "../context/ProjectsContext.jsx";
import { useTasks } from "../hooks/useTasks.js";
import { groupPendingTasks } from "../utils/tasks.js";
import ErrorAlert from "../components/ErrorAlert.jsx";
import TaskBreakdownModal from "../components/TaskBreakdownModal.jsx";
import TaskForm from "../components/TaskForm.jsx";
import TaskRow from "../components/TaskRow.jsx";
import TaskSection from "../components/TaskSection.jsx";

// Visão central de pendências (spec H2). Uma única chamada de listagem,
// independente de quantos projetos existem.
export default function CentralView() {
  const { projects, refreshProjects } = useProjects();
  const {
    tasks,
    loading,
    error,
    setError,
    reload,
    removeLocally,
    updateTask,
    deleteTask,
  } = useTasks(PENDING_FILTER);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { overdue, upcoming, noDate } = groupPendingTasks(tasks);

  function refreshAll() {
    reload();
    refreshProjects();
  }

  async function complete(task) {
    removeLocally(task.id);
    try {
      await api.updateTask(task.id, { status: "done" });
    } catch (err) {
      await reload(); // devolve a tarefa à lista antes de mostrar o erro
      setError(`Não foi possível concluir a tarefa: ${err.message}`);
    }
  }

  async function save(task, changes) {
    await updateTask(task.id, changes);
    refreshAll(); // prazo ou projeto podem mudar a seção e a ordem
  }

  async function remove(task) {
    if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      refreshProjects();
    } catch (err) {
      setError(`Não foi possível excluir a tarefa: ${err.message}`);
    }
  }

  const renderRow = (task) => (
    <TaskRow
      key={task.id}
      task={task}
      projects={projects}
      onComplete={complete}
      onSave={save}
      onDelete={remove}
    />
  );

  return (
    <div className={showBreakdown ? "page with-panel" : "page"}>
      <header className="page-header">
        <div>
          <h1>Pendências</h1>
          <p className="muted">
            Todas as tarefas abertas dos seus projetos, da mais urgente para a
            menos urgente.
          </p>
        </div>
        <button
          type="button"
          className="button secondary"
          onClick={() => setShowBreakdown(true)}
          disabled={projects.length === 0}
        >
          Quebrar meta com IA
        </button>
      </header>

      {projects.length === 0 ? (
        <p className="notice">
          Crie seu primeiro projeto na barra lateral para começar a adicionar
          tarefas.
        </p>
      ) : (
        <TaskForm projects={projects} onCreated={refreshAll} />
      )}

      <ErrorAlert>{error}</ErrorAlert>
      {loading && <p className="muted">Carregando tarefas…</p>}
      {!loading && !error && tasks.length === 0 && (
        <p className="empty">Nenhuma pendência. 🎉</p>
      )}

      <TaskSection title="Atrasadas" tasks={overdue} danger>
        {renderRow}
      </TaskSection>
      <TaskSection title="Com prazo" tasks={upcoming}>
        {renderRow}
      </TaskSection>
      <TaskSection title="Sem prazo" tasks={noDate}>
        {renderRow}
      </TaskSection>

      {showBreakdown && (
        <TaskBreakdownModal
          projects={projects}
          onClose={() => setShowBreakdown(false)}
          onConfirmed={refreshAll}
        />
      )}
    </div>
  );
}
