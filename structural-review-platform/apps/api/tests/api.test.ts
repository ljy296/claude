import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { userStore } from "../src/services/userStore";
import { prisma } from "../src/db/prisma";

const app = createApp();
let adminToken = "";
let reviewerToken = "";

beforeAll(async () => {
  await userStore.ensureSeedAdmin();
  // 确保有一个 reviewer 账号用于权限测试。
  await userStore.createUser({ username: "reviewer1", password: "reviewer12345", role: "reviewer" }).catch(() => undefined);

  const adminLogin = await request(app).post("/api/auth/login").send({ username: "admin", password: "admin12345" });
  adminToken = adminLogin.body.token;
  const reviewerLogin = await request(app).post("/api/auth/login").send({ username: "reviewer1", password: "reviewer12345" });
  reviewerToken = reviewerLogin.body.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("鉴权", () => {
  it("健康检查无需登录", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("未携带令牌访问受保护接口返回 401", async () => {
    const res = await request(app).get("/api/projects");
    expect(res.status).toBe(401);
  });

  it("错误密码登录返回 401", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "admin", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("正确登录返回 token 与用户信息", async () => {
    expect(adminToken).toBeTruthy();
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${adminToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe("admin");
    // 密码哈希绝不外泄
    expect(JSON.stringify(me.body)).not.toContain("passwordHash");
  });
});

describe("项目与资料（持久化 + 安全）", () => {
  let projectId = "";
  let materialId = "";

  it("创建项目并自动生成固定文件夹", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "测试项目A", productCode: "T-A" });
    expect(res.status).toBe(201);
    projectId = res.body.project.id;
    expect(res.body.folders.length).toBeGreaterThan(0);
  });

  it("上传资料后不泄漏 storagePath，且可鉴权下载", async () => {
    const upload = await request(app)
      .post(`/api/projects/${projectId}/folders/MED_004/materials`)
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("materials", Buffer.from("hello,world"), "sample.txt");
    expect(upload.status).toBe(201);
    const material = upload.body.materials[0];
    materialId = material.id;
    expect(material).toBeDefined();
    expect(material.storagePath).toBeUndefined();
    expect(JSON.stringify(upload.body)).not.toContain("storagePath");

    const download = await request(app)
      .get(`/api/projects/${projectId}/materials/${materialId}/download`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(download.status).toBe(200);
    expect(download.text).toContain("hello,world");
  });

  it("拒绝不在白名单内的文件类型", async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/folders/MED_004/materials`)
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("materials", Buffer.from("MZ"), "malware.exe");
    expect(res.status).toBe(400);
  });

  it("数据持久化：新建 app 实例仍能读到项目", async () => {
    const freshApp = createApp();
    const res = await request(freshApp)
      .get("/api/projects")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.projects.some((p: { id: string }) => p.id === projectId)).toBe(true);
  });

  it("彻底删除：reviewer 被拒(403)，admin 允许", async () => {
    const forbidden = await request(app)
      .delete(`/api/materials/${materialId}/permanent`)
      .set("Authorization", `Bearer ${reviewerToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .delete(`/api/materials/${materialId}/permanent`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
  });

  it("缺失项提示为纯读取（多次调用文件夹状态不被写坏）", async () => {
    const first = await request(app)
      .get(`/api/projects/${projectId}/folders/MED_001/missing-hints`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(first.status).toBe(200);
    const folderBefore = await request(app)
      .get(`/api/projects/${projectId}/folders/MED_001`)
      .set("Authorization", `Bearer ${adminToken}`);
    const statusBefore = folderBefore.body.folder.status;
    await request(app)
      .get(`/api/projects/${projectId}/folders/MED_001/missing-hints`)
      .set("Authorization", `Bearer ${adminToken}`);
    const folderAfter = await request(app)
      .get(`/api/projects/${projectId}/folders/MED_001`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(folderAfter.body.folder.status).toBe(statusBefore);
  });
});
