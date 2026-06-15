import { useState } from "react";
import { FixedFolderGrid, type FolderViewModel } from "../components/FixedFolderGrid";
import { buildReportBaseName, materialDeleteActions, materialObjectTypes } from "../config/projectStructure";

type ProjectDetailPageProps = {
  projectName: string;
  folders?: FolderViewModel[];
  onSoftDeleteProject?: () => void;
  onOpenFolder?: (folder: FolderViewModel) => void;
};

export function ProjectDetailPage({ projectName, folders, onSoftDeleteProject, onOpenFolder }: ProjectDetailPageProps) {
  const [selectedFolder, setSelectedFolder] = useState<FolderViewModel | null>(null);

  const exampleReportName = buildReportBaseName({
    projectName,
    folderName: selectedFolder?.name ?? "MED_001_需求受付",
    reviewType: "完整审查",
    date: "20260605",
  });

  return (
    <main className="project-detail-page">
      <header className="project-header">
        <div>
          <p className="eyebrow">结构项目评审平台</p>
          <h1>{projectName}</h1>
          <p>项目资料先按固定目录分类，再进入具体分类上传、审查和出报告。</p>
        </div>
        <button className="danger-button" type="button" onClick={onSoftDeleteProject}>
          删除/移除项目
        </button>
      </header>

      <FixedFolderGrid
        folders={folders}
        onOpenFolder={(folder) => {
          setSelectedFolder(folder);
          onOpenFolder?.(folder);
        }}
      />

      {selectedFolder ? (
        <section className="folder-workspace">
          <div className="section-title-row">
            <div>
              <h2>{selectedFolder.name}</h2>
              <p>{selectedFolder.description}</p>
            </div>
            <span className="status status-ready">{selectedFolder.status}</span>
          </div>

          <div className="folder-entry-actions">
            <button type="button">上传文件/文件夹</button>
            <button type="button">查看资料</button>
            <button type="button">开始审查</button>
            <button type="button">历史报告</button>
            <button type="button">缺失项提示</button>
          </div>

          <div className="folder-rules-grid">
            <article>
              <h3>资料对象类型</h3>
              <ul>
                {materialObjectTypes.map((type) => (
                  <li key={type}>{type}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>删除动作</h3>
              <ul>
                {materialDeleteActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>报告命名示例</h3>
              <p>{exampleReportName}</p>
            </article>
          </div>
        </section>
      ) : (
        <section className="empty-folder-workspace">
          <h2>请选择一个资料目录</h2>
          <p>点击目录后可进入该分类下的上传、删除、审查、历史报告和缺失项提示页面。</p>
        </section>
      )}
    </main>
  );
}
