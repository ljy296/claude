import type { NextFunction, Request, RequestHandler, Response } from "express";
import type {
  MaterialObjectRecord,
  MaterialVersionRecord,
  PublicMaterialObject,
  PublicMaterialVersion,
} from "../services/types";
import { materialDeleteActions, materialObjectTypes, type MaterialDeleteAction, type MaterialObjectType } from "../../../../packages/review-core/src/projectStructure";

/**
 * 包装 async 路由，把 rejection 转发给统一错误中间件。
 * 同时把 handler 的 req.params 收敛为普通字符串字典（Express 5 类型默认为 string|string[]）。
 */
export type TypedRequest = Request<Record<string, string>>;

export function asyncHandler(handler: (req: TypedRequest, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    void handler(req as unknown as TypedRequest, res, next).catch(next);
  };
}

/** 剥离服务器内部字段 storagePath，得到对客户端安全的 DTO。 */
export function toPublicMaterial(material: MaterialObjectRecord): PublicMaterialObject {
  const { storagePath: _drop, ...rest } = material;
  void _drop;
  return rest;
}

export function toPublicVersion(version: MaterialVersionRecord): PublicMaterialVersion {
  const { storagePath: _drop, ...rest } = version;
  void _drop;
  return rest;
}

export function parseMaterialType(value: unknown): MaterialObjectType | undefined {
  return materialObjectTypes.includes(value as MaterialObjectType) ? (value as MaterialObjectType) : undefined;
}

export function parseDeleteAction(value: unknown): MaterialDeleteAction | undefined {
  return materialDeleteActions.includes(value as MaterialDeleteAction) ? (value as MaterialDeleteAction) : undefined;
}

export function optionalString(value: unknown): string | undefined {
  const text = singleValue(value).trim();
  return text || undefined;
}

export function singleValue(value: unknown): string {
  if (Array.isArray(value)) return singleValue(value[0]);
  return typeof value === "string" ? value : "";
}

export function multiValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(singleValue);
  const single = singleValue(value);
  return single ? [single] : [];
}

export function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_");
}
