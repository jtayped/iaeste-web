import LearnMoreBtn from "@/components/common/buttons/learn-more";
import DivideSection from "@/components/common/sections/divide";
import Statistic from "@repo/ui/statistic";
import { H2, Paragraph, Subheader } from "@repo/ui/typography";
import allStatistics from "@/constants/statistics";
import { useTranslations } from "next-intl";

const About = () => {
  const t = useTranslations("HomePage.about");
  const ts = useTranslations("HomePage.stats");

  return (
    <DivideSection innerClassName="md:items-center">
      <article>
        <H2>{t("title")}</H2>
        <Subheader className="mt-3">{t("subtitle")}</Subheader>
        <Paragraph className="mt-5 max-w-[60ch] leading-relaxed">
          {t("description")}
        </Paragraph>
        <div className="mt-8">
          <LearnMoreBtn />
        </div>
      </article>
      <div>
        <ul className="grid grid-cols-2 gap-3 md:gap-4">
          {allStatistics.map((s) => (
            <li key={s.key}>
              <Statistic translationKey={s.key} stat={s.stat} />
            </li>
          ))}
        </ul>
        {/* PRODUCT.md: a public figure has to say which IAESTE it describes and
            carry a date. These four are the international ones. */}
        <p className="mt-4 text-sm text-muted-foreground">{ts("scope")}</p>
      </div>
    </DivideSection>
  );
};

export default About;
