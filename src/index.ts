import { buildServer } from "./server.js";

const port = Number(process.env.PORT ?? 3000);
const host = "0.0.0.0";

const app = buildServer();

async function start() {
  try {
    await app.listen({ port, host });
    // logger already prints the listening address; this is just explicit.
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown so `tsx watch` reloads and Ctrl+C close connections cleanly.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}

start();