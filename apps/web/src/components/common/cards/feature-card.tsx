import { Card } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import React from "react";

/**
 * The site's one icon-and-text card.
 *
 * It replaces three shapes that were doing the same job differently: the
 * company reasons (icon, `H3`, description), the student reasons (icon, a
 * smaller `H3`, and a description rendered with `className="hidden"`), and the
 * team cards (icon, a `CardContent`-wrapped `H3`, a `Subheader`) — which is why
 * the three grids had three different internal rhythms.
 *
 * The navy bar down the leading edge is gone. It is the single most recognisable
 * tell of a generated interface, and the brand reads better carried by the icon
 * tile — a treatment the home page's "com funciona?" band already uses, so this
 * is the site's own language rather than a new one.
 */
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) => {
  return (
    <Card
      className={cn(
        "h-full border-border bg-card transition-colors hover:border-primary/30",
        className,
      )}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/8 text-primary">
        <Icon size={22} aria-hidden />
      </span>
      <h3 className="mt-5 text-lg leading-snug font-semibold tracking-tight text-balance">
        {title}
      </h3>
      {description && (
        <p className="mt-2 leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      )}
    </Card>
  );
};

export default FeatureCard;
