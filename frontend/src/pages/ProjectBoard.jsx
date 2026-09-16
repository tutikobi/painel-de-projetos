import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useProjects } from "../context/ProjectsContext.jsx";
import { useTasks } from "../hooks/useTasks.js";
import { deleteProjectMessage } from "../utils/tasks.js";
import ErrorAlert from "../components/ErrorAlert.jsx";
import ProjectHeader from "../components/ProjectHeader.jsx";
import TaskBreakdownModal from "../components/TaskBreakdownModal.jsx";
import TaskForm from "../components/TaskForm.jsx";
import KanbanBoard from "../components/kanban/KanbanBoard.jsx";

// Página de um projeto: cabeçalho, criação de tarefa e kanban (spec H3).
export default function ProjectBoard() {
  const projectId = Number(useParams().id);
  const navigate = useNavigate();
  const {
    projects,
    loading: projectsLoading,
    refreshProjects,
    removeProject,
  } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const {
    tasks,
    loading,
    error,
    setError,
    reload,
    removeLocally,
    updateTask,
    deleteTask,
  } = useTasks({ project: projectId });
  const [showBreakdown, setShowBreakdown] = useState(false);

  function refreshAll() {
    reload();
    refreshProjects();
  }

  async function move(taskId, status) {
    try {
      await updateTask(taskId, { status }, { optimistic: true });
    } catch (err) {
      setError(`Não foi possível mover a tarefa: ${err.message}`);
    }
  }

  async function save(task, changes) {
    const updated = await updateTask(task.id, changes);
    if (updated.project !== projectId) {
      removeLocally(task.id);
      refreshProjects();
    } else {
      reload(); // o prazo pode mudar a ordem dentro da coluna
    }
  }

  async function removeTask(task) {
    if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      refreshProjects();
    } catch (err) {
      setError(`Não foi possível excluir a tarefa: ${err.message}`);
    }
  }

  // Exclusão em duas etapas (spec: casos extremos).
  async function deleteProject() {
    try {
      const { task_count: count } = await api.countProjectTasks(projectId);
      if (!window.confirm(deleteProjectMessage(count))) return;
      await api.deleteProject(projectId);
      removeProject(projectId);
      navigate("/", { replace: true });
    } catch (err) {
      setError(`Não foi possível excluir o projeto: ${err.message}`);
    }
  }

  if (projectsLoading) return <p className="muted page">Carregando…</p>;
  if (!project) {
    return (
      <div className="page">
        <h1>Projeto não encontrado</h1>
        <Link to="/">Voltar para as pendências</Link>
      </div>
    );
  }

  return (
    <div className={showBreakdown ? "page with-panel" : "page"}>
      <ProjectHeader
        project={project}
        onOpenBreakdown={() => setShowBreakdown(true)}
        onDelete={deleteProject}
      />
      <TaskForm
        projects={projects}
        fixedProjectId={projectId}
        onCreated={refreshAll}
      />
      <ErrorAlert>{error}</ErrorAlert>

      {loading ? (
        <p className="muted">Carregando tarefas…</p>
      ) : (
        <KanbanBoard
          tasks={tasks}
          projects={projects}
          onMove={move}
          onSave={save}
          onDelete={removeTask}
        />
      )}

      {showBreakdown && (
        <TaskBreakdownModal
          projects={projects}
          initialProjectId={projectId}
          onClose={() => setShowBreakdown(false)}
          onConfirmed={refreshAll}
        />
      )}
    </div>
  );
}
