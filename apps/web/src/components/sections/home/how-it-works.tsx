import Section from "@/components/common/sections/section";
import { H3, Paragraph } from "@repo/ui/typography";
import steps from "@/constants/how-it-works";
import { useTranslations } from "next-intl";

const HowItWorks = () => {
  const t = useTranslations("HomePage.steps");

  return (
    <Section className="flex flex-col items-center bg-primary py-14 text-primary-foreground">
      <h2 className="sr-only">{t("title")}</h2>
      <div className="grid grid-cols-1 gap-20 md:grid-cols-3 md:gap-14 lg:gap-28">
        {steps.map((s, idx) => (
          <div key={s.key}>
            <s.icon
              className="rounded-lg bg-white p-3 text-primary shadow"
              size={60}
            />
            <div>
              <H3 className="mb-1">
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
