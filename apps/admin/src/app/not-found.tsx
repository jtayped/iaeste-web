import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { buttonVariants } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";

import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/shell/page-shell";

const TITLE = "no s'ha trobat";

/**
 * Where the detail routes land when `notFound()` is called — an id that never
 * existed, or a record someone deleted between the link being made and being
 * followed. It also catches any URL that matches no route at all.
 *
 * Without it the app falls back to Next's built-in page, which is in English:
 * in a Catalan-only admin panel that reads as a different site rather than as
 * a missing record.
 *
 * It lives at the app root and not in `(app)/`, which is where it belongs by
 * subject matter. A `not-found.tsx` inside the route group is not picked up —
 * verified against the dev server, which kept serving Next's built-in page
 * until the file moved here. The cost is that this renders without the
 * sidebar; the alternative was a boundary that never fires.
 */
export default function NotFound() {
  return (
    <PageShell title={TITLE}>
      <EmptyState
        icon={FileQuestion}
        title="aquesta pàgina no existeix"
        description="l'enllaç deu ser antic, o el registre que buscaves ja no hi és."
        action={
          <Link href="/" className={cn(buttonVariants({ size: "sm" }))}>
            torna al panell
          </Link>
        }
      />
    </PageShell>
  );
}
