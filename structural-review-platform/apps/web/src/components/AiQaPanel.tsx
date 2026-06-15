import { useState, useRef, useEffect } from "react";
import { askProjectQa, askGlobalQa, type AiQaRecord } from "../api/client";

type ProjectQaProps = {
  projectId: string;
  projectName: string;
};

type GlobalQaProps = {
  onClose: () => void;
};

/** 项目内 AI 问答面板（嵌入在项目页面内） */
export function ProjectQaPanel({ projectId, projectName }: ProjectQaProps) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<AiQaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function handleAsk() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(undefined);
    try {
      const result = await askProjectQa(projectId, q);
      setHistory((prev) => [...prev, result.qa]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="qa-panel project-qa">
      <div className="qa-panel-header">
        <div>
          <h3>项目内 AI 问答</h3>
          <p>仅基于「{projectName}」的资料对象、模块解读卡片、报告和风险清单回答。</p>
        </div>
        <span className="qa-scope-badge project-scope">项目范围</span>
      </div>

      <div className="qa-messages">
        {history.length === 0 ? (
          <p className="qa-empty">输入问题开始问答。AI 只能基于已上传资料作出判断，不会自动给最终放行或审批结论。</p>
        ) : null}
        {history.map((qa) => <QaMessage key={qa.id} qa={qa} />)}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="qa-input-row">
        <input
          className="qa-input"
          disabled={loading}
          placeholder="例如：当前项目存在哪些风险？缺少哪些资料？"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleAsk(); }}
        />
        <button
          className="qa-ask-btn"
          disabled={loading || !question.trim()}
          onClick={() => void handleAsk()}
          type="button"
        >
          {loading ? "分析中..." : "提问"}
        </button>
      </div>
      <p className="qa-disclaimer">
        AI 问答边界：仅供参考，不可代替结构工程师的专业判断，不能自动放行、批准 ECO 或关闭测试失败项。
      </p>
    </div>
  );
}

/** 全局资料库 AI 问答浮层（位于页面右下角） */
export function GlobalQaFloat() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        className="global-qa-fab"
        onClick={() => setOpen(true)}
        type="button"
        title="资料库全局问答"
      >
        资料库问答
      </button>
    );
  }

  return (
    <div className="global-qa-modal-overlay">
      <div className="global-qa-modal">
        <GlobalQaPanel onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}

function GlobalQaPanel({ onClose }: GlobalQaProps) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<AiQaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function handleAsk() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(undefined);
    try {
      const result = await askGlobalQa(q);
      setHistory((prev) => [...prev, result.qa]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="qa-panel global-qa">
      <div className="qa-panel-header">
        <div>
          <h3>资料库全局问答</h3>
          <p>基于所有已归档项目的典型问题、DFM案例、ECO案例、测试失败闭环和经验总结回答。</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="qa-scope-badge global-scope">全局范围</span>
          <button className="close-btn" onClick={onClose} type="button" aria-label="关闭">×</button>
        </div>
      </div>

      <div className="qa-messages">
        {history.length === 0 ? (
          <p className="qa-empty">
            可以询问历史 DFM 案例、ECO 经验、测试失败原因等跨项目问题。<br />
            权限说明：只能查询当前用户有权访问的已归档项目资料。
          </p>
        ) : null}
        {history.map((qa) => <QaMessage key={qa.id} qa={qa} />)}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="qa-input-row">
        <input
          className="qa-input"
          disabled={loading}
          placeholder="例如：历史上有哪些 DFM 案例？ECO 常见问题有哪些？"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleAsk(); }}
        />
        <button
          className="qa-ask-btn"
          disabled={loading || !question.trim()}
          onClick={() => void handleAsk()}
          type="button"
        >
          {loading ? "检索中..." : "提问"}
        </button>
      </div>
      <p className="qa-disclaimer">
        AI 问答边界：基于已归档资料推断，不能自动给最终放行、批准 ECO 或关闭测试失败项。资料不足时 AI 会明确告知，不为了回答而回答。
      </p>
    </div>
  );
}

/** 单条问答消息展示组件 */
function QaMessage({ qa }: { qa: AiQaRecord }) {
  const [showEvidence, setShowEvidence] = useState(false);

  const judgabilityColor = {
    "可判断": "#16a34a",
    "部分可判断": "#d97706",
    "资料不足": "#dc2626",
  }[qa.judgability] ?? "#64748b";

  return (
    <article className="qa-message">
      <div className="qa-question">
        <span className="qa-q-label">Q</span>
        <p>{qa.question}</p>
      </div>
      <div className="qa-answer">
        <span className="qa-a-label">A</span>
        <div>
          <div className="qa-judgability" style={{ color: judgabilityColor }}>
            {qa.judgability}
          </div>
          <p style={{ whiteSpace: "pre-wrap" }}>{qa.answer}</p>
          <div className="qa-meta">
            <span className="qa-scope-badge" style={{ fontSize: 11 }}>{qa.permissionScope}</span>
            <button
              className="qa-evidence-toggle"
              onClick={() => setShowEvidence((v) => !v)}
              type="button"
            >
              {showEvidence ? "收起证据来源" : `查看证据来源（${qa.evidenceSources.length}）`}
            </button>
          </div>
          {showEvidence && qa.evidenceSources.length > 0 ? (
            <ul className="qa-evidence-list">
              {qa.evidenceSources.map((source) => (
                <li key={`${source.type}-${source.id}`}>
                  <span className="qa-evidence-type">{evidenceTypeLabel(source.type)}</span>
                  {source.label}
                  {source.folderCode ? ` · ${source.folderCode}` : ""}
                  {source.moduleCode ? ` / ${source.moduleCode}` : ""}
                  {source.timestamp ? ` · ${source.timestamp.slice(0, 16).replace("T", " ")}` : ""}
                </li>
              ))}
            </ul>
          ) : showEvidence ? (
            <p style={{ fontSize: 12, color: "#94a3b8" }}>无明确证据来源记录。</p>
          ) : null}
          <p className="qa-time">{qa.createdAt.slice(0, 16).replace("T", " ")}</p>
        </div>
      </div>
    </article>
  );
}

function evidenceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    project: "项目",
    folder: "阶段",
    module: "模块",
    material: "资料",
    report: "报告",
    risk: "风险",
    interpretation: "解读",
  };
  return map[type] ?? type;
}
