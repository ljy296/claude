import { useEffect, useState } from "react";
import { getRelationGraph, type RelationGraph, type RelationNode } from "../api/client";

type RelationGraphPanelProps = {
  projectId: string;
  folderCode: string;
};

const nodeTypeConfig: Record<RelationNode["type"], { label: string; color: string; bg: string }> = {
  bom: { label: "BOM/Part list", color: "#1d4ed8", bg: "#dbeafe" },
  part: { label: "零件", color: "#7c3aed", bg: "#ede9fe" },
  drawing2d: { label: "2D图纸", color: "#0369a1", bg: "#e0f2fe" },
  drawing3d: { label: "3D图纸", color: "#0f766e", bg: "#ccfbf1" },
  eco: { label: "ECO/ECN", color: "#d97706", bg: "#fef3c7" },
  testIssue: { label: "测试报告", color: "#dc2626", bg: "#fee2e2" },
  troubleList: { label: "Trouble list", color: "#9f1239", bg: "#ffe4e6" },
  module: { label: "模块", color: "#374151", bg: "#f3f4f6" },
  material: { label: "资料", color: "#4b5563", bg: "#f9fafb" },
};

export function RelationGraphPanel({ projectId, folderCode }: RelationGraphPanelProps) {
  const [graph, setGraph] = useState<RelationGraph>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void loadGraph();
  }, [projectId, folderCode]);

  async function loadGraph() {
    setLoading(true);
    try {
      const data = await getRelationGraph(projectId, folderCode);
      setGraph(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p>正在加载关联关系图...</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="relation-graph-empty">
        <p>当前阶段暂无可识别的关联关系。</p>
        <p className="preview-hint">
          上传 BOM/Part list（xlsx）、2D 图纸（dwg/dxf/pdf）、3D 图纸（stp/step/sldprt）、
          ECO/ECN 文件或测试报告后，系统会自动识别关联链路：
          BOM → 零件 → 2D图纸 → 3D图纸 → ECO → 测试问题 → Trouble list
        </p>
      </div>
    );
  }

  // 按类型分组展示节点
  const nodesByType = graph.nodes.reduce<Record<string, RelationNode[]>>((acc, node) => {
    const group = acc[node.type] ?? [];
    group.push(node);
    acc[node.type] = group;
    return acc;
  }, {});

  const typeOrder: RelationNode["type"][] = ["bom", "part", "drawing2d", "drawing3d", "eco", "testIssue", "troubleList", "module", "material"];

  return (
    <div className="relation-graph-panel">
      <div className="relation-chain-bar">
        {typeOrder.filter((type) => nodesByType[type]?.length).map((type, index) => (
          <span key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              className="relation-type-badge"
              style={{ background: nodeTypeConfig[type].bg, color: nodeTypeConfig[type].color }}
            >
              {nodeTypeConfig[type].label}
              <span className="relation-count">{nodesByType[type].length}</span>
            </span>
            {index < typeOrder.filter((t) => nodesByType[t]?.length).length - 1 ? (
              <span className="chain-arrow">→</span>
            ) : null}
          </span>
        ))}
      </div>

      <div className="relation-node-groups">
        {typeOrder.filter((type) => nodesByType[type]?.length).map((type) => {
          const config = nodeTypeConfig[type];
          return (
            <div key={type} className="relation-node-group">
              <h4 style={{ color: config.color }}>{config.label}</h4>
              <div className="relation-node-list">
                {nodesByType[type].map((node) => {
                  const inEdges = graph.edges.filter((e) => e.to === node.id);
                  const outEdges = graph.edges.filter((e) => e.from === node.id);
                  return (
                    <div
                      key={node.id}
                      className="relation-node-card"
                      style={{ borderLeft: `3px solid ${config.color}`, background: config.bg }}
                    >
                      <p className="node-label">{node.label}</p>
                      {inEdges.length > 0 ? (
                        <p className="node-links">← 引用自：{inEdges.map((e) => {
                          const fromNode = graph.nodes.find((n) => n.id === e.from);
                          return fromNode?.label ?? e.from;
                        }).slice(0, 3).join("、")}</p>
                      ) : null}
                      {outEdges.length > 0 ? (
                        <p className="node-links">→ 链接到：{outEdges.map((e) => {
                          const toNode = graph.nodes.find((n) => n.id === e.to);
                          return `${toNode?.label ?? e.to}${e.label ? `（${e.label}）` : ""}`;
                        }).slice(0, 3).join("、")}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="preview-hint" style={{ marginTop: 12 }}>
        共 {graph.nodes.length} 个节点，{graph.edges.length} 条关联边。
        第一版使用文件名规则识别类型，后续可接入 BOM 解析精确重建关系链。
      </p>
    </div>
  );
}
