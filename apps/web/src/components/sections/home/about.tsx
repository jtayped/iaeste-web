import LearnMoreBtn from "@/components/common/buttons/learn-more";
import DivideSection from "@/components/common/sections/divide";
import Statistic from "@/components/ui/statistic";
import { H2, Paragraph, Subheader } from "@/components/ui/typography";
import allStatistics from "@/constants/statistics";
import { useTranslations } from "next-intl";

const About = () => {
  const t = useTranslations("HomePage.about");
  return (
    <DivideSection>
      <article>
        <H2>{t("title")}</H2>
        <Subheader>{t("subtitle")}</Subheader>
        <Paragraph>{t("description")}</Paragraph>
        <LearnMoreBtn />
      </article>
      <div className="grid grid-cols-2 gap-3">
        {allStatistics.map((s, i) => (
          <li key={i} className="list-none">
            <Statistic
              translationKey={s.key}
              stat={s.stat}
              className="h-full"
            />
          </li>
        ))}
      </div>
    </DivideSection>
  );
};

export default About;
