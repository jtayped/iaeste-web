import { useLocale, useTranslations } from "next-intl";
import { Card } from "./card";
import React from "react";
import AnimatedCounter from "./counter";
import { cn } from "@repo/ui/lib/utils";

/**
 * One figure and what it counts. The navy bar down the leading edge is gone —
 * see `common/cards/feature-card.tsx` in the web app for why — and the
 * `CardHeader`/`CardContent` wrappers with it: they were contributing HeroUI's
 * own padding on top of the card's, which is what made these tiles taller than
 * the grid beside them.
 */
const Statistic = ({
  translationKey,
  stat,
  className = "",
}: {
  translationKey: string;
  stat: number;
  className?: string;
}) => {
  const t = useTranslations("HomePage.stats");
  const locale = useLocale();

  return (
    <Card className={cn("h-full", className)}>
      <p className="text-3xl leading-none font-semibold tracking-tight text-primary tabular-nums md:text-4xl">
        <AnimatedCounter from={0} to={stat} duration={1} locale={locale} />+
      </p>
      <p className="mt-3 leading-snug font-medium text-balance md:text-lg">
        {t(`${translationKey}.title`)}
      </p>
      <p className="mt-1 text-sm leading-snug text-pretty text-muted-foreground">
        {t(`${translationKey}.subtitle`)}
      </p>
    </Card>
  );
};

export default Statistic;
