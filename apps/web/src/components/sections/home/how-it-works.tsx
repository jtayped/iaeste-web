import Section from "@/components/common/sections/section";
import { H2, H3, Paragraph } from "@repo/ui/typography";
import steps from "@/constants/how-it-works";
import { useTranslations } from "next-intl";

const HowItWorks = () => {
  const t = useTranslations("HomePage.steps");

  return (
    <Section className="bg-primary text-primary-foreground py-14 flex flex-col items-center">
      <div className="text-center max-w-screen-md">
        <H2>{t("title")}</H2>
        <Paragraph className="text-primary-foreground/70">
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Temporibus,
          nobis?
        </Paragraph>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-20 md:gap-14 lg:gap-28 mt-16">
        {steps.map((s, idx) => (
          <div key={s.key}>
            <s.icon
              className="text-primary bg-white p-3 rounded-lg shadow"
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
