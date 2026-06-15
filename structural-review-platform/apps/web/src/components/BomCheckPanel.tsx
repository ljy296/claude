import { useState } from "react";
import { runBomCheck, type BomDrawingCheckResult } from "../api/client";

type BomCheckPanelProps = {
  projectId: string;
  folderCode: string;
};

export function BomCheckPanel({ projectId, folderCode }: BomCheckPanelProps) {
  const [result, setResult] = useState<BomDrawingCheckResult>();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();

  async function handleRunCheck() {
    setRunning(true);
    setError(undefined);
    try {
      const data = await runBomCheck(projectId, folderCode);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="bom-check-panel">
      <div className="section-title-row">
        <div>
          <h3>BOM / 图纸专项对应检查</h3>
          <p>
            检查 HA1_DE / HA1_CB 前缀的 2D/3D 图纸文件与 BOM/Part list 中「2D图纸」「3D图纸」列的名称对应关系。
            图纸名忽略空格、大小写和扩展名进行匹配。
          </p>
        </div>
        <button
          className="primary-btn"
          disabled={running}
          onClick={() => void handleRunCheck()}
          type="button"
        >
          {running ? "检查中..." : "运行检查"}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {result ? <BomCheckResultView result={result} /> : (
        <p className="preview-hint">点击"运行检查"开始专项对应分析。</p>
      )}
    </div>
  );
}

function BomCheckResultView({ result }: { result: BomDrawingCheckResult }) {
  const hasIssues = result.bomOnlyItems.length > 0 || result.drawingOnlyItems.length > 0 ||
    result.fuzzyMatches.length > 0 || result.versionConflicts.length > 0 ||
    result.tripleGaps.length > 0 || result.namingIssues.length > 0;

  return (
    <div className="bom-check-result">
      <div className="bom-check-meta">
        <span>检查前缀：<strong>{result.checkedPrefix}</strong></span>
        <span>
          使用 BOM Sheet：<strong>{result.usedSheet}</strong>
          {result.sheetIsAutoDetected ? (
            <span className="warning-badge"> 需人工确认</span>
          ) : null}
        </span>
        <span className="check-time">{result.createdAt.slice(0, 16).replace("T", " ")}</span>
      </div>

      {!hasIssues ? (
        <p className="success-hint">未发现明显冲突。建议人工逐项核查版本和材料一致性。</p>
      ) : null}

      <CheckSection
        title="BOM 中有记录但未上传图纸"
        items={result.bomOnlyItems}
        severity="high"
        emptyLabel="无此类问题"
      />
      <CheckSection
        title="已上传图纸但 BOM 中未登记"
        items={result.drawingOnlyItems}
        severity="high"
        emptyLabel="无此类问题"
      />

      {result.fuzzyMatches.length > 0 ? (
        <div className="check-section medium">
          <h4>名称相似但不完全一致</h4>
          <ul>
            {result.fuzzyMatches.map((item) => (
              <li key={`${item.drawing}-${item.bom}`}>
                图纸：「{item.drawing}」→ BOM：「{item.bom}」（相似度 {Math.round(item.similarity * 100)}%）
              </li>
            ))}
          </ul>
        </div>
      ) : <p className="check-ok">✓ 无相似但不一致项</p>}

      {result.versionConflicts.length > 0 ? (
        <div className="check-section high">
          <h4>版本号冲突</h4>
          <ul>
            {result.versionConflicts.map((item) => (
              <li key={item.name}>
                「{item.name}」：图纸版本 <strong>{item.drawingVersion}</strong>，BOM 版本 <strong>{item.bomVersion}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : <p className="check-ok">✓ 无版本号冲突</p>}

      <CheckSection
        title="2D / 3D / BOM 三者缺一"
        items={result.tripleGaps}
        severity="high"
        emptyLabel="三者均有上传"
      />
      <CheckSection
        title="疑似同一零件但命名不规范"
        items={result.namingIssues}
        severity="medium"
        emptyLabel="无命名不规范项"
      />

      {result.suggestions.length > 0 ? (
        <div className="check-suggestions">
          <h4>建议动作</h4>
          <ol>
            {result.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function CheckSection({ title, items, severity, emptyLabel }: {
  title: string;
  items: string[];
  severity: "high" | "medium" | "low";
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="check-ok">✓ {emptyLabel}</p>;
  }
  return (
    <div className={`check-section ${severity}`}>
      <h4>{title}（{items.length}项）</h4>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}
