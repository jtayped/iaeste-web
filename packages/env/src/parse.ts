import type { z } from "zod";

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
