import Section from "@/components/common/sections/section";
import Step from "@repo/ui/step";
import { H2 } from "@repo/ui/typography";
import steps from "@/constants/how-it-works";
import { useTranslations } from "next-intl";

const HowItWorks = () => {
  const t = useTranslations("HomePage.steps");

  return (
    <Section>
      <H2>{t("title")}</H2>
      <ol className="grid md:grid-cols-3 mt-8 gap-5">
        {steps.map((s, i) => (
          <li key={i}>
            <Step translationKey={s.key} Icon={s.icon} idx={i + 1} />
          </li>
        ))}
      </ol>
    </Section>
  );
};

export default HowItWorks;
