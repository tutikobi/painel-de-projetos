import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useProjects } from "../context/ProjectsContext.jsx";
import TaskBreakdownModal from "../components/TaskBreakdownModal.jsx";
import TaskEditor from "../components/TaskEditor.jsx";
import TaskForm from "../components/TaskForm.jsx";
import TaskMeta from "../components/TaskMeta.jsx";

const PENDING = { status: "todo,doing" };

// Visão central de pendências (spec H2).
export default function CentralView() {
  const { projects, refreshProjects } = useProjects();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Uma única chamada, independente de quantos projetos existem.
  const loadTasks = useCallback(async () => {
    try {
      setTasks(await api.listTasks(PENDING));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function complete(task) {
    setTasks((current) => current.filter((t) => t.id !== task.id));
    try {
      await api.updateTask(task.id, { status: "done" });
    } catch (err) {
      setError(`Não foi possível concluir a tarefa: ${err.message}`);
      loadTasks();
    }
  }

  async function save(task, changes) {
    await api.updateTask(task.id, changes);
    setEditingId(null);
    await Promise.all([loadTasks(), refreshProjects()]);
  }

  async function remove(task) {
    if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      setTasks((current) => current.filter((t) => t.id !== task.id));
      refreshProjects();
    } catch (err) {
      setError(`Não foi possível excluir a tarefa: ${err.message}`);
    }
  }

  function afterChange() {
    loadTasks();
    refreshProjects();
  }

  const overdue = tasks.filter((t) => t.due_date && t.is_overdue);
  const upcoming = tasks.filter((t) => t.due_date && !t.is_overdue);
  const noDate = tasks.filter((t) => !t.due_date);

  const renderList = (list) => (
    <ul className="task-list">
      {list.map((task) => (
        <li
          key={task.id}
          className={task.is_overdue ? "task-row overdue" : "task-row"}
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
              <input
                type="checkbox"
                aria-label={`Concluir "${task.title}"`}
                onChange={() => complete(task)}
              />
              <div className="task-main">
                <span className="task-title">{task.title}</span>
                <span className="task-sub">
                  <Link
                    to={`/projects/${task.project}`}
                    className="project-tag"
                  >
                    <span
                      className="color-dot"
                      style={{ background: task.project_color }}
                      aria-hidden="true"
                    />
                    {task.project_name}
                  </Link>
                  {task.status === "doing" && (
                    <span className="badge">Em andamento</span>
                  )}
                  <TaskMeta task={task} />
                </span>
              </div>
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
                  onClick={() => remove(task)}
                >
                  Excluir
                </button>
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
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
        <TaskForm projects={projects} onCreated={afterChange} />
      )}

      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="muted">Carregando tarefas…</p>}

      {!loading && tasks.length === 0 && !error && (
        <p className="empty">Nenhuma pendência. 🎉</p>
      )}

      {overdue.length > 0 && (
        <section className="task-section">
          <h2 className="section-title danger">Atrasadas ({overdue.length})</h2>
          {renderList(overdue)}
        </section>
      )}
      {upcoming.length > 0 && (
        <section className="task-section">
          <h2 className="section-title">Com prazo ({upcoming.length})</h2>
          {renderList(upcoming)}
        </section>
      )}
      {noDate.length > 0 && (
        <section className="task-section">
          <h2 className="section-title">Sem prazo ({noDate.length})</h2>
          {renderList(noDate)}
        </section>
      )}

      {showBreakdown && (
        <TaskBreakdownModal
          projects={projects}
          onClose={() => setShowBreakdown(false)}
          onConfirmed={afterChange}
        />
      )}
    </div>
  );
}
