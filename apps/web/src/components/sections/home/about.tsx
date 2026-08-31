import LearnMoreBtn from "@/components/common/buttons/learn-more";
import DivideSection from "@/components/common/sections/divide";
import Statistic from "@repo/ui/statistic";
import { H2, Paragraph, Subheader } from "@repo/ui/typography";
import allStatistics from "@/constants/statistics";
import { useTranslations } from "next-intl";

const About = () => {
  const t = useTranslations("HomePage.about");
  return (
    <DivideSection>
      <article>
        <H2>{t("title")}</H2>
        <Subheader>{t("subtitle")}</Subheader>
        <Paragraph className="max-w-[65ch] leading-relaxed">
          {t("description")}
        </Paragraph>
        <LearnMoreBtn />
      </article>
      <ul className="grid grid-cols-2 gap-3 md:gap-4">
        {allStatistics.map((s, i) => (
          <li key={i} className="list-none">
            <Statistic
              translationKey={s.key}
              stat={s.stat}
              className="h-full"
            />
          </li>
        ))}
      </ul>
    </DivideSection>
  );
};

export default About;
