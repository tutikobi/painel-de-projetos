import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../api/client.js";

const ProjectsContext = createContext(null);

export function ProjectsProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    api.listProjects().then(
      (data) => {
        if (ignore) return;
        setProjects(data);
        setLoading(false);
      },
      (err) => {
        if (ignore) return;
        setError(err.message);
        setLoading(false);
      },
    );
    return () => {
      ignore = true;
    };
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      setProjects(await api.listProjects());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const createProject = useCallback(async (data) => {
    const project = await api.createProject(data);
    // Aparece na lista e nos seletores sem recarregar (spec H1).
    setProjects((current) => [...current, project]);
    return project;
  }, []);

  const removeProject = useCallback((id) => {
    setProjects((current) => current.filter((p) => p.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      projects,
      loading,
      error,
      refreshProjects,
      createProject,
      removeProject,
    }),
    [projects, loading, error, refreshProjects, createProject, removeProject],
  );
  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  return useContext(ProjectsContext);
}
