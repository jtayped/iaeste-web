import React from "react";
import { Card } from "./card";
import { useTranslations } from "next-intl";
import { IconType } from "react-icons";

const Step = ({
  translationKey,
  idx,
  Icon,
}: {
  translationKey: string;
  idx: number;
  Icon: IconType;
}) => {
  const t = useTranslations("HomePage.steps");

  return (
    <Card className="p-6 flex flex-col items-center text-center gap-4">
      <div className="bg-primary/10 h-min p-7">
        <Icon size={50} />
      </div>
      <div>
        <h3 className="text-xl font-semibold">
          Step {idx}: {t(`${translationKey}.title`)}
        </h3>
        <p className="text-primary mt-2">{t(`${translationKey}.subtitle`)}</p>
        <p className="text-muted-foreground text-sm mt-1">
          {t(`${translationKey}.description`)}
        </p>
      </div>
    </Card>
  );
};

export default Step;
