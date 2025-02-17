import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "./card";
import React from "react";
import AnimatedCounter from "./counter";

const Statistic = ({
  translationKey,
  stat,
}: {
  translationKey: string;
  stat: number;
}) => {
  const t = useTranslations("HomePage.stats");
  return (
    <Card accent>
      <CardHeader className="pb-0 md:pb-4">
        <p className="text-4xl font-semibold text-primary">
          <AnimatedCounter from={0} to={stat} duration={1} />+
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-lg md:text-xl">{t(`${translationKey}.title`)}</p>
        <p className="text-xs md:text-sm text-muted-foreground">
          {t(`${translationKey}.subtitle`)}
        </p>
      </CardContent>
    </Card>
  );
};

export default Statistic;
