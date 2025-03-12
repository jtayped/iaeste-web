import React from "react";
import { Card } from "./card";
import { useTranslations } from "next-intl";
import { type IconType } from "react-icons";
import { H3, Paragraph, Subheader } from "./typography";

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
    <Card className="p-6 flex flex-col items-center text-center">
      <div className="bg-primary/10 h-min p-7">
        <Icon size={50} />
      </div>
      <article>
        <H3>
          Step {idx}: {t(`${translationKey}.title`)}
        </H3>
        <Subheader className="text-primary">
          {t(`${translationKey}.subtitle`)}
        </Subheader>
        <Paragraph className="text-muted-foreground text-sm">
          {t(`${translationKey}.description`)}
        </Paragraph>
      </article>
    </Card>
  );
};

export default Step;
