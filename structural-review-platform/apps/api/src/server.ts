import "./config/loadEnv"; // 必须最先执行：在 Prisma/config 初始化前加载 .env
import { createApp } from "./app";
import { env } from "./config/env";
import { userStore } from "./services/userStore";
import { prisma } from "./db/prisma";

async function main() {
  // 首次启动创建默认管理员。
  const seed = await userStore.ensureSeedAdmin();
  if (seed.created) {
    console.log(`[seed] 已创建默认管理员：${seed.username}（请尽快修改默认密码）`);
  }
  if (env.jwtSecretIsDefault) {
    console.warn("[warn] 未设置 JWT_SECRET，正在使用不安全的默认密钥，请在 .env 中配置。");
  }

  const app = createApp();
  app.listen(env.port, env.host, () => {
    console.log(`Structural review platform API listening on http://${env.host}:${env.port}`);
  });
}

main().catch(async (error) => {
  console.error("服务启动失败：", error);
  await prisma.$disconnect();
  process.exit(1);
});
