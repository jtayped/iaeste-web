import LearnMoreBtn from "@/components/common/buttons/learn-more";
import DivideSection from "@/components/common/sections/divide";
import Statistic from "@/components/ui/statistic";
import { H2, Paragraph, Subheader } from "@/components/ui/typography";
import allStatistics from "@/constants/statistics";

const About = () => {
  return (
    <DivideSection>
      <article>
        <H2>What is IAESTE?</H2>
        <Subheader>IAESTE is the best org</Subheader>
        <Paragraph>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsa optio
          odit quam culpa consectetur fuga quo enim iste laborum repellat.
          Assumenda quia dolorum doloremque voluptates accusantium corporis
          magni ex quae!
        </Paragraph>
        <LearnMoreBtn />
      </article>
      <div className="grid grid-cols-2 gap-3">
        {allStatistics.map((s, i) => (
          <li key={i} className="list-none">
            <Statistic translationKey={s.key} stat={s.stat} />
          </li>
        ))}
      </div>
    </DivideSection>
  );
};

export default About;
