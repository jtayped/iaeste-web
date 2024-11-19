import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "./card";
import React from "react";

const Statistic = ({
  translationKey,
  stat,
}: {
  translationKey: string;
  stat: string;
}) => {
  const t = useTranslations("HomePage.stats");
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute left-0 h-full w-1 bg-primary" />
      <CardHeader>
        <p className="text-4xl font-semibold text-primary">{stat}</p>
      </CardHeader>
      <CardContent>
        <p className="text-xl">{t(`${translationKey}.title`)}</p>
        <p className="text-sm text-muted-foreground">
          {t(`${translationKey}.subtitle`)}
        </p>
      </CardContent>
    </Card>
  );
};

export default Statistic;
