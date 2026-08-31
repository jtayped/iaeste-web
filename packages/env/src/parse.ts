import { z } from "zod";

/**
 * Parses a set of environment variables against a schema, failing loudly at
 * module load rather than silently producing `undefined` deep inside a render.
 *
 * Every caller must pass the variables as an explicit literal object
 * (`{ FOO: process.env.FOO }`) rather than handing over `process.env` itself:
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` into client bundles when it
 * can see the property access statically.
 */
export function parseEnv<TSchema extends z.ZodType>(
  schema: TSchema,
  values: unknown,
  scope: string,
): z.infer<TSchema> {
  const parsed = schema.safeParse(values);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(
        (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
      )
      .join("\n");

    throw new Error(`Invalid ${scope} environment variables:\n${issues}`);
  }

  return parsed.data;
}

/**
 * A URL that is required in production but falls back to a localhost dev port
 * anywhere else.
 *
 * A dev default is a convenience; shipped to production it is a trap — a var
 * nobody set silently resolves to `http://localhost:...` and the deployed page
 * links there. Gating the `.default()` on `NODE_ENV` means a missing value in
 * production fails the env parse loudly at boot (see `parseEnv`) instead.
 *
 * `nodeEnv` is a parameter, defaulted to `process.env.NODE_ENV`, only so the
 * two branches are unit-testable without mutating the process environment.
 */
export function urlRequiredInProduction(
  devFallback: string,
  nodeEnv: string | undefined = process.env.NODE_ENV,
) {
  const url = z.string().url();
  return nodeEnv === "production" ? url : url.default(devFallback);
}
