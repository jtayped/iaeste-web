import { render } from "@react-email/components";
import type { ReactElement } from "react";

/**
 * Renders a template in this package to the HTML a mail client receives.
 *
 * Exported from here rather than letting callers reach for
 * `@react-email/components` themselves for two reasons. The repo rule is the
 * first: `apps/api` declares `@repo/email` and not React Email, and an import
 * that only resolves by hoisting breaks an isolated per-app deploy. The second
 * is the one that matters at runtime — the broadcast composer's preview and
 * its send must produce identical bytes, and they can only be identical if
 * there is one rendering entry point rather than two call sites that might
 * drift in their options.
 */
export function renderEmail(element: ReactElement): Promise<string> {
  return render(element);
}
