import { ChangeEvent, useEffect, useState } from "react";
import {
  createReview,
  deleteMaterial,
  getFolder,
  confirmModule,
  interpretModule,
  reportDownloadUrl,
  uploadMaterials,
  type MaterialObject,
  type ModuleInterpretation,
  type Project,
  type ProjectFolder,
  type CrossModuleConflict,
  type ReviewJob,
  type ReviewModule,
  type ReviewReport,
} from "../api/client";
import { materialDeleteActions, materialObjectTypes, type MaterialDeleteAction, type MaterialObjectType } from "../config/projectStructure";
import { BomCheckPanel } from "../components/BomCheckPanel";
import { RelationGraphPanel } from "../components/RelationGraphPanel";
import { ProjectQaPanel } from "../components/AiQaPanel";

type FolderPageProps = {
  project: Project;
  folderCode: string;
  onBackToProject: () => void;
  onOpenMaterial: (materialId: string) => void;
};

export function FolderPage({ project, folderCode, onBackToProject, onOpenMaterial }: FolderPageProps) {
  const [folder, setFolder] = useState<ProjectFolder>();
  const [modules, setModules] = useState<ReviewModule[]>([]);
  const [selectedModuleCode, setSelectedModuleCode] = useState<string>();
  const [materials, setMaterials] = useState<MaterialObject[]>([]);
  const [objectType, setObjectType] = useState<MaterialObjectType>("单文件");
  const [lastReview, setLastReview] = useState<ReviewJob>();
  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [missingHints, setMissingHints] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<CrossModuleConflict[]>([]);
  const [latestInterpretation, setLatestInterpretation] = useState<ModuleInterpretation>();
  const [activePanel, setActivePanel] = useState<"materials" | "reports" | "missing" | "interpretation" | "bom-check" | "relation-graph" | "qa">("materials");
  const [error, setError] = useState<string>();

  useEffect(() => {
    void refresh();
  }, [project.id, folderCode]);

  async function refresh() {
    const result = await getFolder(project.id, folderCode);
    setFolder(result.folder);
    setModules(result.modules);
    setSelectedModuleCode((current) => current ?? result.modules[0]?.code);
    setMaterials(result.materials);
    setReports(result.reports);
    setMissingHints(result.missingHints);
    setConflicts(result.conflicts);
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>, uploadType?: MaterialObjectType) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setError(undefined);
    try {
      await uploadMaterials(project.id, folderCode, files, uploadType ?? objectType, selectedModuleCode ? [selectedModuleCode] : []);
      await refresh();
      setActivePanel("materials");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
    } finally {
      event.target.value = "";
    }
  }

  async function handleDelete(materialId: string, action: MaterialDeleteAction) {
    await deleteMaterial(materialId, action);
    await refresh();
  }

  async function handleReview() {
    const result = await createReview(project.id, folderCode, "完整审查");
    setLastReview(result.review);
    setReports(result.reports);
    setActivePanel("reports");
    await refresh();
  }

  async function handleInterpretModule() {
    if (!selectedModuleCode) return;
    const result = await interpretModule(project.id, folderCode, selectedModuleCode);
    setLatestInterpretation(result.interpretation);
    setReports((current) => [result.report, ...current]);
    setActivePanel("interpretation");
    await refresh();
  }

  async function handleConfirmModule() {
    if (!selectedModuleCode) return;
    const result = await confirmModule(project.id, folderCode, selectedModuleCode);
    setLatestInterpretation(result.interpretation);
    setActivePanel("interpretation");
    await refresh();
  }

  if (!folder) {
    return (
      <main className="project-detail-page">
        <p>正在加载分类目录...</p>
      </main>
    );
  }

  return (
    <main className="project-detail-page">
      <header className="project-header">
        <div>
          <p className="eyebrow">{project.name}</p>
          <h1>{folder.name}</h1>
          <p>{folder.description}</p>
        </div>
        <button onClick={onBackToProject} type="button">返回固定目录</button>
      </header>

      <section className="folder-workspace module-section">
        <div className="section-title-row">
          <div>
            <h2>第一块：模块清单</h2>
            <p>每个阶段文件夹由多个工程判断模块组成。AI 可解读，但“人工已确认”必须由用户操作。</p>
          </div>
          <span className="status status-ready">{folder.status}</span>
        </div>

        <div className="module-grid">
          {modules.map((reviewModule) => (
            <button
              className={reviewModule.code === selectedModuleCode ? "module-card selected" : "module-card"}
              key={reviewModule.code}
              onClick={() => setSelectedModuleCode(reviewModule.code)}
              type="button"
            >
              <div className="module-card-head">
                <span>{reviewModule.required ? "必传模块" : "选传模块"}</span>
                <strong>{reviewModule.status}</strong>
              </div>
              <h3>{reviewModule.name}</h3>
              <p>{reviewModule.purpose}</p>
              <div className="module-meta">
                <span>资料 {reviewModule.materialCount}</span>
                <span>解读 {reviewModule.interpretationCount}</span>
                <span>报告 {reviewModule.reportCount}</span>
              </div>
              {reviewModule.code === selectedModuleCode ? (
                <div className="module-admission">
                  <b>最低可审查条件</b>
                  <ul>
                    {reviewModule.minimumReviewConditions.map((condition) => (
                      <li key={condition}>{condition}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <section className="folder-workspace">
        <div className="section-title-row">
          <div>
            <h2>第二块：资料对象区</h2>
            <p>资料对象可以是单文件、文件夹、压缩包或批量文件；当前上传会关联到选中的模块，后续可扩展为多模块引用。</p>
          </div>
          <span className="status status-ready">{selectedModuleCode ? modules.find((item) => item.code === selectedModuleCode)?.name : "未选择模块"}</span>
        </div>

        <div className="folder-entry-actions action-toolbar">
          <select value={objectType} onChange={(event) => setObjectType(event.target.value as MaterialObjectType)}>
            {materialObjectTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <label className="upload-button">
            上传文件
            <input multiple onChange={(event) => void handleUpload(event, objectType)} type="file" />
          </label>
          <label className="upload-button primary-upload">
            上传文件夹
            <input
              multiple
              onChange={(event) => void handleUpload(event, "文件夹")}
              type="file"
              {...{ webkitdirectory: "", directory: "" }}
            />
          </label>
        </div>
        {error ? <p className="error-text">{error}</p> : null}

        {lastReview ? (
          <article className="report-name-card">
            <h3>最新报告命名</h3>
            <p>{lastReview.reportBaseName}</p>
          </article>
        ) : null}
      </section>

      <section className="folder-workspace">
        <div className="section-title-row">
          <div>
            <h2>第三块：审查操作区</h2>
            <p>模块深度解读生成模块卡片，阶段审查生成双层正式报告：模块级摘要 + M0-M9 综合结论。</p>
          </div>
        </div>
        <div className="folder-entry-actions action-toolbar">
          <button onClick={() => void handleInterpretModule()} type="button">深度解读当前模块</button>
          <button onClick={() => void handleReview()} type="button">审查整个阶段文件夹</button>
          <button onClick={() => void handleReview()} type="button">生成正式报告</button>
          <button onClick={() => setActivePanel("reports")} type="button">查看历史报告</button>
          <button onClick={() => setActivePanel("missing")} type="button">查看缺失项</button>
          <button onClick={() => void handleConfirmModule()} type="button">人工确认当前模块</button>
          <button onClick={() => setActivePanel("bom-check")} type="button">BOM/图纸专项检查</button>
          <button onClick={() => setActivePanel("relation-graph")} type="button">关联关系视图</button>
          <button onClick={() => setActivePanel("qa")} type="button">项目AI问答</button>
        </div>
      </section>

      {activePanel === "materials" ? (
        <section className="folder-workspace data-panel">
          <h2>资料对象</h2>
          {materials.length === 0 ? <p>当前分类暂无资料。</p> : null}
          {materials.map((material) => (
            <article className="material-row" key={material.id}>
              <div>
                <h3
                  className="material-name-link"
                  onClick={() => onOpenMaterial(material.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") onOpenMaterial(material.id); }}
                >
                  {material.name}
                </h3>
                <p>
                  {material.type}
                  {material.effectiveVersion ? ` · 版本：${material.effectiveVersion}` : ""}
                  {" · 模块："}
                  {material.moduleCodes.join("、") || "未关联"}
                  {material.sizeBytes ? ` · ${formatBytes(material.sizeBytes)}` : " · 文件夹/虚拟对象"}
                </p>
              </div>
              <div className="row-actions">
                <button
                  className="view-btn"
                  onClick={() => onOpenMaterial(material.id)}
                  type="button"
                >
                  查看详情
                </button>
                {materialDeleteActions.map((action) => (
                  <button
                    className={action === "彻底删除" ? "danger-button" : undefined}
                    key={action}
                    onClick={() => void handleDelete(material.id, action)}
                    type="button"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {activePanel === "interpretation" && latestInterpretation ? (
        <section className="folder-workspace data-panel">
          <h2>模块解读卡片</h2>
          <article className="module-interpretation-card">
            <div className="module-card-head">
              <span>{latestInterpretation.moduleName}</span>
              <strong>{latestInterpretation.status}</strong>
            </div>
            <p><b>资料状态：</b>{latestInterpretation.materialStatus}</p>
            <p><b>准入规则：</b>{latestInterpretation.admissionResult.conclusion}</p>
            <p><b>信息来源：</b>{latestInterpretation.sourceType}</p>
            <p><b>核心内容摘要：</b>{latestInterpretation.coreSummary}</p>
            <p><b>结构相关判断：</b>{latestInterpretation.structuralJudgment}</p>
            <p><b>置信度：</b>{latestInterpretation.confidence}</p>
            <p><b>是否阻塞当前阶段：</b>{latestInterpretation.blocksStage ? "是" : "否"}</p>
            <h3>风险点</h3>
            <ul>{latestInterpretation.risks.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3>缺失项</h3>
            <ul>{latestInterpretation.missingItems.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3>需确认问题</h3>
            <ul>{latestInterpretation.confirmationQuestions.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3>建议动作</h3>
            <ul>{latestInterpretation.suggestedActions.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3>证据链</h3>
            <ul>
              {latestInterpretation.evidenceChain.map((evidence) => (
                <li key={`${evidence.materialObjectId ?? evidence.moduleCode}-${evidence.excerpt ?? evidence.sourceType}`}>
                  项目 {evidence.projectId} / 阶段 {evidence.folderCode} / 模块 {evidence.moduleCode} / 资料 {evidence.materialName ?? "未知"} / 版本 {evidence.materialVersion ?? "未知"} / 来源 {evidence.sourceType}
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}

      <section className="folder-workspace data-panel">
        <h2>跨模块冲突检查</h2>
        {conflicts.length === 0 ? <p>当前暂未发现跨模块冲突。MED_004 会重点检查 2D/3D 图纸与 BOM/Part list 的名称对应。</p> : null}
        {conflicts.map((conflict) => (
          <article className="conflict-card" key={conflict.id}>
            <div className="module-card-head">
              <span>{conflict.severity}风险</span>
              <strong>{conflict.relatedModules.join(" / ")}</strong>
            </div>
            <h3>{conflict.title}</h3>
            <p>{conflict.description}</p>
            <p><b>建议：</b>{conflict.suggestion}</p>
            <p><b>相关资料：</b>{conflict.relatedMaterials.join("、")}</p>
          </article>
        ))}
      </section>

      {activePanel === "reports" ? (
        <section className="folder-workspace data-panel">
          <h2>历史报告</h2>
          {reports.length === 0 ? <p>当前分类还没有报告，请先点击“开始审查”。</p> : null}
          {reports.map((report) => (
            <article className="report-row" key={report.id}>
              <div>
                <h3>{report.baseName}</h3>
                <p>{report.title} · {report.createdAt}</p>
                <a href={reportDownloadUrl(project.id, report.id)} download>
                  下载 Markdown 报告
                </a>
              </div>
              <pre>{report.markdownContent}</pre>
            </article>
          ))}
        </section>
      ) : null}

      {activePanel === "missing" ? (
        <section className="folder-workspace data-panel">
          <h2>缺失项提示</h2>
          <div className="hint-list">
            {missingHints.map((hint) => (
              <article className="hint-card" key={hint}>{hint}</article>
            ))}
          </div>
        </section>
      ) : null}

      {activePanel === "bom-check" ? (
        <section className="folder-workspace data-panel">
          <BomCheckPanel projectId={project.id} folderCode={folderCode} />
        </section>
      ) : null}

      {activePanel === "relation-graph" ? (
        <section className="folder-workspace data-panel">
          <h2>关联关系视图</h2>
          <RelationGraphPanel projectId={project.id} folderCode={folderCode} />
        </section>
      ) : null}

      {activePanel === "qa" ? (
        <section className="folder-workspace data-panel">
          <ProjectQaPanel projectId={project.id} projectName={project.name} />
        </section>
      ) : null}
    </main>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
