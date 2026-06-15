import { FormEvent, useEffect, useState } from "react";
import { createProject, listProjects, restoreProject, softDeleteProject, type Project } from "../api/client";

type ProjectListPageProps = {
  onOpenProject: (projectId: string) => void;
};

export function ProjectListPage({ onOpenProject }: ProjectListPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    void refresh();
  }, [includeDeleted]);

  async function refresh() {
    setProjects(await listProjects(includeDeleted));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    try {
      const result = await createProject({ name });
      setName("");
      await refresh();
      onOpenProject(result.project.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    }
  }

  async function handleSoftDelete(projectId: string) {
    await softDeleteProject(projectId);
    await refresh();
  }

  async function handleRestore(projectId: string) {
    await restoreProject(projectId);
    await refresh();
  }

  return (
    <main className="project-list-page">
      <header className="project-header">
        <div>
          <p className="eyebrow">结构项目评审平台</p>
          <h1>项目列表</h1>
          <p>项目支持新建、软删除和恢复；删除后保留审查记录、报告和审计日志。</p>
        </div>
        <label className="inline-check">
          <input
            checked={includeDeleted}
            onChange={(event) => setIncludeDeleted(event.target.checked)}
            type="checkbox"
          />
          显示已删除项目
        </label>
      </header>

      <form className="create-project-form" onSubmit={handleCreate}>
        <input
          onChange={(event) => setName(event.target.value)}
          placeholder="输入项目名称，例如：智能助听器"
          required
          value={name}
        />
        <button type="submit">新建项目</button>
      </form>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="project-table">
        {projects.map((project) => (
          <article className="project-row" key={project.id}>
            <div>
              <h2>{project.name}</h2>
              <p>{project.deletedAt ? `已删除：${project.deletedAt}` : "正常项目"}</p>
            </div>
            <div className="row-actions">
              <button disabled={Boolean(project.deletedAt)} onClick={() => onOpenProject(project.id)} type="button">
                进入项目
              </button>
              {project.deletedAt ? (
                <button onClick={() => void handleRestore(project.id)} type="button">恢复</button>
              ) : (
                <button className="danger-button" onClick={() => void handleSoftDelete(project.id)} type="button">
                  删除/移除
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
