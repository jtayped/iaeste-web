import { Button } from "@/components/ui/button";
import Statistic from "@/components/ui/statistic";
import allStatistics from "@/constants/statistics";
import { Link } from "@/i18n/routing";
import { RxArrowTopRight } from "react-icons/rx";

const About = () => {
  return (
    <section id="about" className="mt-14">
      <div className="grid md:grid-cols-2 gap-10 px-screen">
        <div>
          <h2 className="text-3xl font-bold">What is IAESTE?</h2>
          <p className="text-lg mt-3">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsa optio
            odit quam culpa consectetur fuga quo enim iste laborum repellat.
            Assumenda quia dolorum doloremque voluptates accusantium corporis
            magni ex quae!
          </p>
          <Button asChild className="mt-4">
            <Link href={"https://iaeste.org"}>
              Learn more <RxArrowTopRight />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {allStatistics.map((s, i) => (
            <li key={i} className="list-none">
              <Statistic translationKey={s.key} stat={s.stat} />
            </li>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;
