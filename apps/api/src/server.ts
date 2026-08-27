import { serve } from "@hono/node-server";

import { closeDb } from "@repo/db/client";

import app from "./app";
import { getApiPort } from "./config";

const port = getApiPort();

const server = serve({ fetch: app.fetch, port }, ({ port: listeningPort }) => {
  console.log(`API listening on http://localhost:${listeningPort}`);
});

const shutdownTimeoutMs = 10_000;
let shuttingDown = false;

async function finishShutdown(error?: Error): Promise<void> {
  try {
    await closeDb();
  } catch (closeError) {
    console.error(
      "Failed to close the database pool during shutdown",
      closeError,
    );
    process.exitCode = 1;
  }

  if (error) {
    console.error("Failed to close the API server", error);
    process.exitCode = 1;
  }
}

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down`);

  const timeout = setTimeout(() => {
    console.error("API shutdown exceeded 10 seconds; forcing exit");
    process.exit(1);
  }, shutdownTimeoutMs);
  timeout.unref();

  server.close((error) => {
    void finishShutdown(error).finally(() => clearTimeout(timeout));
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
