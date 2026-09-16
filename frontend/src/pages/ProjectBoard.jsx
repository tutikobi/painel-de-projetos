import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { api } from "../api/client.js";
import { useProjects } from "../context/ProjectsContext.jsx";
import TaskBreakdownModal from "../components/TaskBreakdownModal.jsx";
import TaskEditor from "../components/TaskEditor.jsx";
import TaskForm from "../components/TaskForm.jsx";
import TaskMeta from "../components/TaskMeta.jsx";

const COLUMNS = [
  { status: "todo", label: "A fazer" },
  { status: "doing", label: "Em andamento" },
  { status: "done", label: "Concluído" },
];

// Kanban por projeto (spec H3).
export default function ProjectBoard() {
  const { id } = useParams();
  const projectId = Number(id);
  const navigate = useNavigate();
  const {
    projects,
    loading: projectsLoading,
    refreshProjects,
    removeProject,
  } = useProjects();
  const project = projects.find((p) => p.id === projectId);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setTasks(await api.listTasks({ project: projectId }));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    setEditingId(null);
    loadTasks();
  }, [loadTasks]);

  async function handleDragEnd({ source, destination, draggableId }) {
    if (!destination || destination.droppableId === source.droppableId) return;
    const taskId = Number(draggableId);
    const status = destination.droppableId;
    const previous = tasks;

    setTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, status } : t)),
    );
    try {
      const updated = await api.updateTask(taskId, { status });
      setTasks((current) =>
        current.map((t) => (t.id === taskId ? updated : t)),
      );
    } catch (err) {
      setTasks(previous);
      setError(`Não foi possível mover a tarefa: ${err.message}`);
    }
  }

  async function save(task, changes) {
    const updated = await api.updateTask(task.id, changes);
    setEditingId(null);
    if (updated.project !== projectId) {
      setTasks((current) => current.filter((t) => t.id !== task.id));
      refreshProjects();
    } else {
      loadTasks();
    }
  }

  async function removeTask(task) {
    if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      setTasks((current) => current.filter((t) => t.id !== task.id));
      refreshProjects();
    } catch (err) {
      setError(`Não foi possível excluir a tarefa: ${err.message}`);
    }
  }

  // Exclusão em duas etapas (spec: casos extremos).
  async function deleteProject() {
    try {
      const { task_count: count } = await api.countProjectTasks(projectId);
      const message =
        count > 0
          ? `Este projeto tem ${count} ${count === 1 ? "tarefa" : "tarefas"}. Excluir mesmo assim?`
          : "Excluir este projeto?";
      if (!window.confirm(message)) return;
      await api.deleteProject(projectId);
      removeProject(projectId);
      navigate("/", { replace: true });
    } catch (err) {
      setError(`Não foi possível excluir o projeto: ${err.message}`);
    }
  }

  function afterChange() {
    loadTasks();
    refreshProjects();
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
      <header className="page-header">
        <div>
          <h1 className="with-dot">
            <span
              className="color-dot large"
              style={{ background: project.color }}
              aria-hidden="true"
            />
            {project.name}
          </h1>
          {project.description && (
            <p className="muted">{project.description}</p>
          )}
        </div>
        <div className="row">
          <button
            type="button"
            className="button secondary"
            onClick={() => setShowBreakdown(true)}
          >
            Quebrar meta com IA
          </button>
          <button
            type="button"
            className="button-link danger"
            onClick={deleteProject}
          >
            Excluir projeto
          </button>
        </div>
      </header>

      <TaskForm
        projects={projects}
        fixedProjectId={projectId}
        onCreated={afterChange}
      />

      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="muted">Carregando tarefas…</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="board">
            {COLUMNS.map((column) => {
              const columnTasks = tasks.filter(
                (t) => t.status === column.status,
              );
              return (
                <Droppable droppableId={column.status} key={column.status}>
                  {(provided, snapshot) => (
                    <section
                      className={
                        snapshot.isDraggingOver ? "column over" : "column"
                      }
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      <h2 className="column-title">
                        {column.label}{" "}
                        <span className="count">{columnTasks.length}</span>
                      </h2>
                      {columnTasks.map((task, index) => (
                        <Draggable
                          draggableId={String(task.id)}
                          index={index}
                          key={task.id}
                          isDragDisabled={editingId === task.id}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <article
                              className={[
                                "card",
                                task.is_overdue ? "overdue" : "",
                                dragSnapshot.isDragging ? "dragging" : "",
                              ].join(" ")}
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                            >
                              {editingId === task.id ? (
                                <TaskEditor
                                  task={task}
                                  projects={projects}
                                  onSave={(changes) => save(task, changes)}
                                  onCancel={() => setEditingId(null)}
                                />
                              ) : (
                                <>
                                  <p className="task-title">{task.title}</p>
                                  <TaskMeta task={task} />
                                  <div className="task-actions">
                                    <button
                                      type="button"
                                      className="button-link"
                                      onClick={() => setEditingId(task.id)}
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      className="button-link danger"
                                      onClick={() => removeTask(task)}
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </>
                              )}
                            </article>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </section>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {showBreakdown && (
        <TaskBreakdownModal
          projects={projects}
          initialProjectId={projectId}
          onClose={() => setShowBreakdown(false)}
          onConfirmed={afterChange}
        />
      )}
    </div>
  );
}
