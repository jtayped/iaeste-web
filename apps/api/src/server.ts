import { serve } from "@hono/node-server";

import app from "./app";
import { getApiPort } from "./config";

const port = getApiPort();

serve({ fetch: app.fetch, port }, ({ port: listeningPort }) => {
  console.log(`API listening on http://localhost:${listeningPort}`);
});
