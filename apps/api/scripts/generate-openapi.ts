import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import app from "../src/app";
import { getOpenAPIDocument } from "../src/openapi";

const outputPath = fileURLToPath(new URL("../openapi.json", import.meta.url));
const document = getOpenAPIDocument(app);

await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(`Generated ${outputPath}`);
