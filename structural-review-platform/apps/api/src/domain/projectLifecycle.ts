import {
  buildReportBaseName,
  fixedProjectFolders,
  type MaterialDeleteAction,
  type MaterialObjectType,
} from "../../../../packages/review-core/src/projectStructure";

export type CreateProjectInput = {
  name: string;
  productCode?: string;
  description?: string;
};

export type ProjectFolderSeed = {
  code: string;
  name: string;
  description: string;
  status: "未上传";
  sortOrder: number;
};

export type MaterialObjectInput = {
  folderCode: string;
  moduleCodes?: string[];
  type: MaterialObjectType;
  name: string;
  storagePath?: string;
  sizeBytes?: number;
  mimeType?: string;
};

export type MaterialDeletionResult = {
  action: MaterialDeleteAction;
  keepsReviewRecord: boolean;
  movesToRecycleBin: boolean;
  requiresAdmin: boolean;
  auditAction: string;
};

export function buildDefaultProjectFolders(): ProjectFolderSeed[] {
  return fixedProjectFolders.map((folder, index) => ({
    code: folder.code,
    name: folder.name,
    description: folder.description,
    status: "未上传",
    sortOrder: index,
  }));
}

export function describeProjectSoftDelete(projectId: string) {
  return {
    projectId,
    deletedAt: new Date(),
    keeps: ["审查记录", "报告", "资料对象记录", "审计日志"],
    hidesFromDefaultList: true,
    auditAction: "project.soft_delete",
  };
}

export function describeMaterialDeletion(action: MaterialDeleteAction): MaterialDeletionResult {
  if (action === "从本次审查移除") {
    return {
      action,
      keepsReviewRecord: true,
      movesToRecycleBin: false,
      requiresAdmin: false,
      auditAction: "review_material.remove_from_review",
    };
  }

  if (action === "从分类文件夹删除") {
    return {
      action,
      keepsReviewRecord: true,
      movesToRecycleBin: true,
      requiresAdmin: false,
      auditAction: "material.move_to_recycle_bin",
    };
  }

  return {
    action,
    keepsReviewRecord: true,
    movesToRecycleBin: false,
    requiresAdmin: true,
    auditAction: "material.permanently_delete",
  };
}

export function buildFolderReportBaseName(params: {
  projectName: string;
  folderName: string;
  reviewType: string;
  date: string;
}) {
  return buildReportBaseName(params);
}
