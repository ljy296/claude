import { fixedProjectFolders, folderActions, type FolderStatus } from "../config/projectStructure";

export type FolderViewModel = {
  code: string;
  name: string;
  description: string;
  status: FolderStatus;
  materialCount: number;
  reportCount: number;
};

type FixedFolderGridProps = {
  folders?: FolderViewModel[];
  onOpenFolder?: (folder: FolderViewModel) => void;
};

const statusClassName: Record<FolderStatus, string> = {
  未上传: "status status-empty",
  已上传: "status status-uploaded",
  待审查: "status status-ready",
  审查中: "status status-running",
  已出报告: "status status-reported",
  需补充: "status status-missing",
};

export function FixedFolderGrid({ folders, onOpenFolder }: FixedFolderGridProps) {
  const folderRows =
    folders ??
    fixedProjectFolders.map((folder) => ({
      ...folder,
      status: "未上传" as FolderStatus,
      materialCount: 0,
      reportCount: 0,
    }));

  return (
    <section className="folder-grid-section">
      <div className="section-title-row">
        <div>
          <h2>项目资料目录</h2>
          <p>进入项目后先按固定目录分类管理资料，再进入分类执行上传、审查和报告生成。</p>
        </div>
      </div>

      <div className="folder-grid">
        {folderRows.map((folder) => (
          <button
            className="folder-card"
            key={folder.code}
            type="button"
            onClick={() => onOpenFolder?.(folder)}
          >
            <div className="folder-card-header">
              <span className="folder-icon">文件夹</span>
              <span className={statusClassName[folder.status]}>{folder.status}</span>
            </div>
            <h3>{folder.name}</h3>
            <p>{folder.description}</p>
            <div className="folder-meta">
              <span>资料 {folder.materialCount}</span>
              <span>报告 {folder.reportCount}</span>
            </div>
            <div className="folder-actions">
              {folderActions.map((action) => (
                <span key={action}>{action}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
