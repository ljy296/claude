import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen(port, () => {
  console.log(`Structural review platform API listening on http://127.0.0.1:${port}`);
});
