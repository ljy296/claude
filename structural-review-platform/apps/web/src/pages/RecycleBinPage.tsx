import { useEffect, useState } from "react";
import { listRecycleBin, restoreMaterial, type MaterialObject } from "../api/client";

type RecycleBinPageProps = {
  onBack: () => void;
};

export function RecycleBinPage({ onBack }: RecycleBinPageProps) {
  const [materials, setMaterials] = useState<MaterialObject[]>([]);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const result = await listRecycleBin();
    setMaterials(result.materials);
  }

  async function handleRestore(materialId: string) {
    await restoreMaterial(materialId);
    await refresh();
  }

  return (
    <main className="project-detail-page">
      <header className="project-header">
        <div>
          <p className="eyebrow">资料对象回收站</p>
          <h1>回收站</h1>
          <p>从分类文件夹删除的资料对象会进入回收站，可恢复到原分类目录。</p>
        </div>
        <button onClick={onBack} type="button">返回项目列表</button>
      </header>

      <section className="folder-workspace">
        {materials.length === 0 ? <p>回收站暂无资料对象。</p> : null}
        {materials.map((material) => (
          <article className="material-row" key={material.id}>
            <div>
              <h2>{material.name}</h2>
              <p>{material.type} · 删除时间：{material.deletedAt}</p>
            </div>
            <button onClick={() => void handleRestore(material.id)} type="button">恢复</button>
          </article>
        ))}
      </section>
    </main>
  );
}
