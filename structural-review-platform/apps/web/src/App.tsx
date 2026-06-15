import { useEffect, useMemo, useState } from "react";
import { getProject, softDeleteProject, type Project, type ProjectFolder } from "./api/client";
import { FolderPage } from "./pages/FolderPage";
import { MaterialDetailPage } from "./pages/MaterialDetailPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectListPage } from "./pages/ProjectListPage";
import { RecycleBinPage } from "./pages/RecycleBinPage";
import { GlobalQaFloat } from "./components/AiQaPanel";

type Route =
  | { name: "projects" }
  | { name: "project"; projectId: string }
  | { name: "folder"; projectId: string; folderCode: string }
  | { name: "material"; projectId: string; materialId: string }
  | { name: "recycleBin" };

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  const route = useMemo(() => parseRoute(path), [path]);

  useEffect(() => {
    const listener = () => setPath(window.location.pathname);
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);

  function navigate(nextPath: string) {
    window.history.pushState(null, "", nextPath);
    setPath(nextPath);
  }

  return (
    <>
      <nav className="top-nav">
        <span className="nav-brand">结构项目评审平台</span>
        <button onClick={() => navigate("/")} type="button">项目列表</button>
        <button onClick={() => navigate("/recycle-bin")} type="button">回收站</button>
      </nav>

      {route.name === "projects" ? (
        <ProjectListPage onOpenProject={(projectId) => navigate(`/projects/${projectId}`)} />
      ) : null}

      {route.name === "project" ? (
        <ProjectRoute
          onBack={() => navigate("/")}
          onOpenFolder={(projectId, folderCode) => navigate(`/projects/${projectId}/folders/${folderCode}`)}
          projectId={route.projectId}
        />
      ) : null}

      {route.name === "folder" ? (
        <FolderRoute
          folderCode={route.folderCode}
          onBackToProject={() => navigate(`/projects/${route.projectId}`)}
          onOpenMaterial={(materialId) => navigate(`/projects/${route.projectId}/materials/${materialId}`)}
          projectId={route.projectId}
        />
      ) : null}

      {route.name === "material" ? (
        <MaterialDetailPage
          materialId={route.materialId}
          projectId={route.projectId}
          onBack={() => window.history.back()}
        />
      ) : null}

      {route.name === "recycleBin" ? (
        <RecycleBinPage onBack={() => navigate("/")} />
      ) : null}

      {/* 全局资料库问答浮层，始终显示 */}
      <GlobalQaFloat />
    </>
  );
}

function ProjectRoute({
  onBack,
  onOpenFolder,
  projectId,
}: {
  onBack: () => void;
  onOpenFolder: (projectId: string, folderCode: string) => void;
  projectId: string;
}) {
  const [project, setProject] = useState<Project>();
  const [folders, setFolders] = useState<ProjectFolder[]>([]);

  useEffect(() => {
    void getProject(projectId).then((result) => {
      setProject(result.project);
      setFolders(result.folders);
    });
  }, [projectId]);

  async function handleSoftDelete() {
    await softDeleteProject(projectId);
    onBack();
  }

  if (!project) return <main className="project-detail-page"><p>正在加载项目...</p></main>;

  return (
    <ProjectDetailPage
      folders={folders}
      onOpenFolder={(folder) => onOpenFolder(projectId, folder.code)}
      onSoftDeleteProject={() => void handleSoftDelete()}
      projectName={project.name}
    />
  );
}

function FolderRoute({
  folderCode,
  onBackToProject,
  onOpenMaterial,
  projectId,
}: {
  folderCode: string;
  onBackToProject: () => void;
  onOpenMaterial: (materialId: string) => void;
  projectId: string;
}) {
  const [project, setProject] = useState<Project>();

  useEffect(() => {
    void getProject(projectId).then((result) => setProject(result.project));
  }, [projectId]);

  if (!project) return <main className="project-detail-page"><p>正在加载项目...</p></main>;

  return (
    <FolderPage
      folderCode={folderCode}
      onBackToProject={onBackToProject}
      onOpenMaterial={onOpenMaterial}
      project={project}
    />
  );
}

function parseRoute(path: string): Route {
  if (path === "/recycle-bin") return { name: "recycleBin" };

  const materialMatch = path.match(/^\/projects\/([^/]+)\/materials\/([^/]+)$/);
  if (materialMatch) {
    return {
      name: "material",
      projectId: decodeURIComponent(materialMatch[1]),
      materialId: decodeURIComponent(materialMatch[2]),
    };
  }

  const folderMatch = path.match(/^\/projects\/([^/]+)\/folders\/([^/]+)$/);
  if (folderMatch) {
    return {
      name: "folder",
      projectId: decodeURIComponent(folderMatch[1]),
      folderCode: decodeURIComponent(folderMatch[2]),
    };
  }

  const projectMatch = path.match(/^\/projects\/([^/]+)$/);
  if (projectMatch) {
    return { name: "project", projectId: decodeURIComponent(projectMatch[1]) };
  }

  return { name: "projects" };
}
