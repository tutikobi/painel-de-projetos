import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useProjects } from "../context/ProjectsContext.jsx";
import ColorDot from "./ColorDot.jsx";
import ProjectForm from "./ProjectForm.jsx";

export default function Layout() {
  const { user, logout } = useAuth();
  const { projects, loading, error } = useProjects();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Painel de Projetos</div>

        <nav className="nav">
          <NavLink to="/" end className="nav-link">
            Pendências
          </NavLink>
        </nav>

        <section className="sidebar-section">
          <h2 className="sidebar-heading">Projetos</h2>
          {loading && <p className="muted">Carregando…</p>}
          {error && <p className="error-text">{error}</p>}
          {!loading && !error && projects.length === 0 && (
            <p className="muted">Nenhum projeto ainda.</p>
          )}
          <ul className="project-list">
            {projects.map((project) => (
              <li key={project.id}>
                <NavLink to={`/projects/${project.id}`} className="nav-link">
                  <ColorDot color={project.color} />
                  <span className="project-name">{project.name}</span>
                  <span className="count">{project.task_count}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          <ProjectForm />
        </section>

        <div className="sidebar-footer">
          <span className="muted">{user.username}</span>
          <button type="button" className="button-link" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
