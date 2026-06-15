import { useEffect, useState, ChangeEvent } from "react";
import {
  getMaterialDetail,
  addMaterialVersion,
  setEffectiveVersion,
  type MaterialDetail,
  type MaterialVersion,
  type AuditLog,
} from "../api/client";

type MaterialDetailPageProps = {
  projectId: string;
  materialId: string;
  onBack: () => void;
};

type ActiveTab = "basic" | "preview" | "parse" | "relations" | "versions" | "reviews" | "audit";

const tabLabels: Record<ActiveTab, string> = {
  basic: "基础信息",
  preview: "预览",
  parse: "解析结果",
  relations: "关联关系",
  versions: "版本历史",
  reviews: "审查记录",
  audit: "操作日志",
};

export function MaterialDetailPage({ projectId, materialId, onBack }: MaterialDetailPageProps) {
  const [detail, setDetail] = useState<MaterialDetail>();
  const [activeTab, setActiveTab] = useState<ActiveTab>("basic");
  const [error, setError] = useState<string>();
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [versionNote, setVersionNote] = useState("");

  useEffect(() => {
    void loadDetail();
  }, [materialId]);

  async function loadDetail() {
    try {
      const data = await getMaterialDetail(projectId, materialId);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleVersionUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !detail) return;
    setUploadingVersion(true);
    setError(undefined);
    try {
      await addMaterialVersion(projectId, materialId, file, { note: versionNote || undefined });
      await loadDetail();
      setVersionNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingVersion(false);
      event.target.value = "";
    }
  }

  async function handleSetEffective(versionId: string) {
    try {
      await setEffectiveVersion(projectId, materialId, versionId);
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (!detail) {
    return (
      <main className="project-detail-page">
        {error ? <p className="error-text">{error}</p> : <p>正在加载资料详情...</p>}
      </main>
    );
  }

  const { material, versions, reports, auditLogs } = detail;

  return (
    <main className="project-detail-page">
      <header className="project-header">
        <div>
          <p className="eyebrow">资料对象详情</p>
          <h1>{material.name}</h1>
          <p>
            {material.type}
            {material.effectiveVersion ? ` · 当前有效版本：${material.effectiveVersion}` : ""}
            {material.sizeBytes ? ` · ${formatBytes(material.sizeBytes)}` : " · 文件夹/虚拟对象"}
          </p>
        </div>
        <button onClick={onBack} type="button">返回</button>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      <nav className="detail-tab-bar">
        {(Object.keys(tabLabels) as ActiveTab[]).map((tab) => (
          <button
            className={tab === activeTab ? "tab-btn active" : "tab-btn"}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tabLabels[tab]}
          </button>
        ))}
      </nav>

      {activeTab === "basic" ? (
        <section className="folder-workspace data-panel">
          <h2>基础信息</h2>
          <table className="info-table">
            <tbody>
              <tr><th>资料名称</th><td>{material.name}</td></tr>
              <tr><th>类型</th><td>{material.type}</td></tr>
              <tr><th>MIME类型</th><td>{material.mimeType ?? "未知"}</td></tr>
              <tr><th>大小</th><td>{material.sizeBytes ? formatBytes(material.sizeBytes) : "—"}</td></tr>
              <tr><th>当前有效版本</th><td><strong className="version-badge">{material.effectiveVersion ?? "未知"}</strong></td></tr>
              <tr><th>版本数量</th><td>{material.versionIds.length}</td></tr>
              <tr><th>关联模块</th><td>{material.moduleCodes.join("、") || "未关联"}</td></tr>
              <tr><th>所属阶段</th><td>{material.folderCode}</td></tr>
              <tr><th>上传时间</th><td>{material.createdAt}</td></tr>
              {material.metadata ? <tr><th>备注</th><td>{material.metadata}</td></tr> : null}
            </tbody>
          </table>
        </section>
      ) : null}

      {activeTab === "preview" ? (
        <section className="folder-workspace data-panel">
          <h2>预览</h2>
          {renderPreview(material.name, material.storagePath, material.mimeType)}
        </section>
      ) : null}

      {activeTab === "parse" ? (
        <section className="folder-workspace data-panel">
          <h2>解析结果</h2>
          {renderParseResult(material.name, material.mimeType)}
        </section>
      ) : null}

      {activeTab === "relations" ? (
        <section className="folder-workspace data-panel">
          <h2>关联关系</h2>
          <p className="section-desc">展示当前资料对象在 BOM → 零件 → 2D图纸 → 3D图纸 → ECO → 测试问题 → Trouble list 链路中的位置。</p>
          <div className="relation-chain">
            <RelationChainView material={material} />
          </div>
          {reports.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <b>被以下 {reports.length} 份报告引用：</b>
              <ul>{reports.slice(0, 8).map((r) => <li key={r.id}>{r.baseName}</li>)}</ul>
            </div>
          ) : <p>暂未被任何报告引用。</p>}
        </section>
      ) : null}

      {activeTab === "versions" ? (
        <section className="folder-workspace data-panel">
          <h2>版本历史</h2>
          <p className="section-desc">
            <strong>当前有效版本：</strong>
            <span className="version-badge">{material.effectiveVersion ?? "未知"}</span>
            &nbsp;历史报告绑定旧版本，新审查默认使用有效版本。
          </p>

          <div className="version-upload-row">
            <input
              placeholder="版本备注（可选）"
              style={{ flex: 1 }}
              type="text"
              value={versionNote}
              onChange={(e) => setVersionNote(e.target.value)}
            />
            <label className="upload-button">
              {uploadingVersion ? "上传中..." : "替换/上传新版本"}
              <input
                accept="*/*"
                disabled={uploadingVersion}
                type="file"
                onChange={(e) => void handleVersionUpload(e)}
              />
            </label>
          </div>

          {versions.length === 0 ? <p>暂无版本历史。</p> : null}
          <div className="version-list">
            {versions.map((version) => (
              <VersionCard
                key={version.id}
                version={version}
                isActive={material.activeVersionId === version.id}
                onSetEffective={() => void handleSetEffective(version.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "reviews" ? (
        <section className="folder-workspace data-panel">
          <h2>审查记录</h2>
          {reports.length === 0 ? <p>该资料对象尚未被任何审查报告引用。</p> : null}
          {reports.map((report) => (
            <article className="report-row" key={report.id}>
              <h3>{report.baseName}</h3>
              <p>{report.title} · {report.createdAt}</p>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === "audit" ? (
        <section className="folder-workspace data-panel">
          <h2>操作日志</h2>
          <p className="section-desc">记录对该资料对象的所有操作，包括上传、查看、版本替换、删除、恢复、绑定/解绑模块、设置有效版本、AI问答引用等。</p>
          {auditLogs.length === 0 ? <p>暂无操作记录。</p> : null}
          <div className="audit-log-list">
            {auditLogs.map((log) => (
              <AuditLogRow key={log.id} log={log} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function VersionCard({ version, isActive, onSetEffective }: {
  version: MaterialVersion;
  isActive: boolean;
  onSetEffective: () => void;
}) {
  return (
    <article className={`version-card${isActive ? " active-version" : ""}`}>
      <div className="version-card-head">
        <span className="version-badge">{version.versionTag}</span>
        {isActive ? <span className="active-badge">当前有效版本</span> : (
          <button className="set-version-btn" onClick={onSetEffective} type="button">
            设为有效版本
          </button>
        )}
      </div>
      <p><b>文件名：</b>{version.name}</p>
      <p><b>上传时间：</b>{version.uploadedAt}</p>
      {version.sizeBytes ? <p><b>大小：</b>{formatBytes(version.sizeBytes)}</p> : null}
      {version.note ? <p><b>备注：</b>{version.note}</p> : null}
    </article>
  );
}

function AuditLogRow({ log }: { log: AuditLog }) {
  const actionMap: Record<string, string> = {
    "material.upload": "上传",
    "material.view": "查看",
    "material.replace_version": "替换版本",
    "material.modify_metadata": "修改元数据",
    "material.soft_delete": "删除/移入回收站",
    "material.restore": "恢复",
    "material.permanent_delete": "彻底删除",
    "material.remove_from_review": "从审查移除",
    "material.link_module": "绑定模块",
    "material.unlink_module": "解绑模块",
    "material.set_effective_version": "设置有效版本",
    "module.confirm": "人工确认",
    "report.generate": "生成报告",
    "ai_qa.reference": "AI问答引用",
  };

  return (
    <div className="audit-log-row">
      <span className="audit-action">{actionMap[log.action] ?? log.action}</span>
      <span className="audit-message">{log.message ?? "—"}</span>
      <span className="audit-time">{log.createdAt}</span>
    </div>
  );
}

function RelationChainView({ material }: { material: MaterialDetail["material"] }) {
  const name = material.name.toLowerCase();
  let role = "其他资料";
  if (/bom|part.?list/i.test(name)) role = "BOM / Part list";
  else if (/2d|dwg|dxf/i.test(name)) role = "2D图纸";
  else if (/3d|stp|step|sldprt/i.test(name)) role = "3D图纸";
  else if (/eco|ecn|变更/i.test(name)) role = "ECO/ECN";
  else if (/测试|test|跌落|振动/i.test(name)) role = "测试报告";
  else if (/trouble|问题清单/i.test(name)) role = "Trouble list";

  const chain = ["BOM/Part list", "2D图纸", "3D图纸", "ECO/ECN", "测试报告", "Trouble list"];

  return (
    <div className="relation-chain-view">
      {chain.map((step, index) => (
        <span key={step} className="chain-item">
          <span className={step === role ? "chain-node active-node" : "chain-node"}>{step}</span>
          {index < chain.length - 1 ? <span className="chain-arrow">→</span> : null}
        </span>
      ))}
      <p style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>
        当前资料角色：<strong>{role}</strong>
      </p>
    </div>
  );
}

function renderPreview(name: string, storagePath?: string, mimeType?: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (/pdf/i.test(ext) || mimeType?.includes("pdf")) {
    return (
      <div className="preview-frame">
        <p className="preview-hint">PDF 文件已存储于服务器本地（{storagePath ? "路径已记录" : "路径未知"}）。在线预览需要集成文件服务器端点。</p>
        <p>文件名：{name}</p>
      </div>
    );
  }
  if (/png|jpg|jpeg|gif|webp/i.test(ext) || mimeType?.startsWith("image/")) {
    return <p className="preview-hint">图片预览：文件存储于服务器本地，在线预览需集成文件服务端点后启用。</p>;
  }
  if (/md|txt/i.test(ext) || mimeType?.startsWith("text/")) {
    return <p className="preview-hint">文本/Markdown：支持内容预览，需要集成文件读取端点后显示。</p>;
  }
  if (/xlsx|xls|csv/i.test(ext)) {
    return <p className="preview-hint">Excel/CSV：支持 sheet 列表、表头、关键列预览，需要集成 exceljs 解析端点后显示。</p>;
  }
  if (/docx|doc/i.test(ext)) {
    return <p className="preview-hint">Word：支持抽取文本和缩略图，需要集成 mammoth 解析端点后显示。</p>;
  }
  if (/pptx|ppt/i.test(ext)) {
    return <p className="preview-hint">PPT：支持抽取文本，需要集成解析端点后显示。</p>;
  }
  if (/stp|step|sldprt|prt|iges|igs/i.test(ext)) {
    return <p className="preview-hint">3D 文件（{ext.toUpperCase()}）：第一版仅展示文件信息和关联关系，不承诺在线几何解析。</p>;
  }
  return <p className="preview-hint">该文件格式（{ext || "未知"}）暂不支持在线预览。</p>;
}

function renderParseResult(name: string, mimeType?: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (/xlsx|xls|csv/i.test(ext)) {
    return (
      <div>
        <p>系统会自动识别 BOM/Part list 的以下内容：</p>
        <ul>
          <li>Sheet 名称（优先匹配 HA1_DE / HA1_CB 前缀）</li>
          <li>「2D图纸」列中的图纸文件名清单</li>
          <li>「3D图纸」列中的图纸文件名清单</li>
          <li>零件号、版本号、材料等关键列</li>
        </ul>
        <p className="preview-hint">详细解析结果在执行 BOM/图纸专项检查后显示。</p>
      </div>
    );
  }
  if (/docx|doc/i.test(ext)) {
    return <p className="preview-hint">Word 文档：mammoth 抽取正文文本，用于模块解读时的关键词匹配和证据链构建。</p>;
  }
  if (/pdf/i.test(ext) || mimeType?.includes("pdf")) {
    return <p className="preview-hint">PDF：pdf-parse 抽取文本，用于模块解读时的内容分析。</p>;
  }
  if (/stp|step|sldprt|prt/i.test(ext)) {
    return <p className="preview-hint">3D 文件：当前版本仅记录文件名、版本、关联关系；几何解析将在后续版本中支持。</p>;
  }
  return <p className="preview-hint">当前文件格式的解析结果将在执行模块解读后显示。</p>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
