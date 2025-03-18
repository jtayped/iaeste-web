import Section from "@/components/common/sections/section";
import { H2, H3, Paragraph } from "@repo/ui/typography";
import steps from "@/constants/how-it-works";
import { useTranslations } from "next-intl";

const HowItWorks = () => {
  const t = useTranslations("HomePage.steps");

  return (
    <Section className="bg-primary text-primary-foreground py-10">
      <H2 className="text-center">{t("title")}</H2>
      <div className="grid grid-cols-3 gap-28 mt-12">
        {steps.map((s, idx) => (
          <div key={s.key}>
            <s.icon
              className="text-primary bg-white p-3 rounded-lg"
              size={60}
            />
            <div className="mt-2">
              <H3>
                {idx + 1}. {t(`${s.key}.title`)}
              </H3>
              <Paragraph className="text-primary-foreground/70">
                {t(`${s.key}.description`)}
              </Paragraph>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};

export default HowItWorks;
