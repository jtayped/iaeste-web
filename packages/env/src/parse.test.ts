import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

import { parseEnv, urlRequiredInProduction } from "./parse";

describe("parseEnv", () => {
  it("returns the parsed values on success", () => {
    const result = parseEnv(
      z.object({ PORT: z.coerce.number() }),
      { PORT: "3000" },
      "test",
    );

    assert.deepEqual(result, { PORT: 3000 });
  });

  it("applies schema defaults for absent variables", () => {
    const result = parseEnv(
      z.object({ MODE: z.enum(["on", "off"]).default("off") }),
      { MODE: undefined },
      "test",
    );

    assert.deepEqual(result, { MODE: "off" });
  });

  it("throws naming the scope and every offending variable", () => {
    assert.throws(
      () =>
        parseEnv(
          z.object({ A: z.string(), B: z.string().email() }),
          { A: undefined, B: "nope" },
          "web server",
        ),
      (error: Error) => {
        assert.match(error.message, /Invalid web server environment variables/);
        assert.match(error.message, /- A:/);
        assert.match(error.message, /- B:/);
        return true;
      },
    );
  });

  it("rejects a value outside an enum instead of coercing it", () => {
    // Regression: `NEXT_PUBLIC_INSCRIPCIONS_STATE=open` used to be cast to
    // "on" | "off" and silently read as closed.
    assert.throws(() =>
      parseEnv(
        z.object({ STATE: z.enum(["on", "off"]).default("off") }),
        { STATE: "open" },
        "test",
      ),
    );
  });
});

describe("urlRequiredInProduction", () => {
  const schema = (nodeEnv: string | undefined) =>
    z.object({ URL: urlRequiredInProduction("http://localhost:3006", nodeEnv) });

  it("applies the localhost fallback outside production", () => {
    for (const nodeEnv of ["development", "test", undefined]) {
      assert.deepEqual(schema(nodeEnv).parse({ URL: undefined }), {
        URL: "http://localhost:3006",
      });
    }
  });

  it("requires the variable in production", () => {
    assert.throws(() => schema("production").parse({ URL: undefined }));
  });

  it("still validates a supplied value in every environment", () => {
    for (const nodeEnv of ["development", "production"]) {
      assert.deepEqual(schema(nodeEnv).parse({ URL: "https://cms.example.cat" }), {
        URL: "https://cms.example.cat",
      });
      assert.throws(() => schema(nodeEnv).parse({ URL: "not-a-url" }));
    }
  });
});
