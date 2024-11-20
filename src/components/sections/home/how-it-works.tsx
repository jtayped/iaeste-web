import Step from "@/components/ui/step";
import steps from "@/constants/how-it-works";
import { useTranslations } from "next-intl";

const HowItWorks = () => {
  const t = useTranslations("HomePage.steps");

  return (
    <div className="px-screen mt-20">
      <h2 className="text-4xl font-bold text-center">{t("title")}</h2>
      <ol className="grid md:grid-cols-3 mt-8 gap-5">
        {steps.map((s, i) => (
          <li key={i}>
            <Step translationKey={s.key} Icon={s.icon} idx={i + 1} />
          </li>
        ))}
      </ol>
    </div>
  );
};

export default HowItWorks;
