import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("platformStore internal debugging workflow", () => {
  it("keeps a project workflow persisted and reviewable", async () => {
    process.env.PLATFORM_STORE_PATH = join(
      process.cwd(),
      "storage",
      `platform-store-test-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
    );
    const { platformStore } = await import("../src/services/platformStore");

    const project = platformStore.createProject({
      name: `内部调试样例_${Date.now()}`,
      productCode: "HA1",
    });

    const material = platformStore.addMaterial(project.id, {
      folderCode: "MED_004",
      moduleCodes: ["bom-part-list"],
      type: "单文件",
      name: "HA1_DE_Part List_RevA.xlsx",
      storagePath: join("storage", "uploads", "HA1_DE_Part List_RevA.xlsx"),
      sizeBytes: 2048,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const detail = platformStore.getMaterialDetail(material.id);
    expect(detail.parseFeedback.status).toBe("parsed");
    expect(detail.parseFeedback.requiresManualConfirmation).toBe(true);

    const review = platformStore.createReview(project.id, "MED_004", "完整审查");
    const report = platformStore.listReports(project.id, "MED_004")[0];
    expect(review.status).toBe("succeeded");
    expect(report.markdownContent).toContain("M0-M9");
    expect(platformStore.getReport(report.id)?.baseName).toBe(report.baseName);

    const persistence = platformStore.getPersistenceStatus();
    expect(persistence.mode).toBe("json-snapshot");
    expect(existsSync(persistence.path)).toBe(true);
  });
});
