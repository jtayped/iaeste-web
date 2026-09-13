import Band from "@/components/common/sections/band";
import { H2 } from "@repo/ui/typography";
import steps from "@/constants/how-it-works";
import { useTranslations } from "next-intl";

const HowItWorks = () => {
  const t = useTranslations("HomePage.steps");

  return (
    <Band>
      <H2 className="max-w-[20ch]">{t("title")}</H2>
      <ol className="mt-12 grid grid-cols-1 gap-12 md:mt-16 md:grid-cols-3 md:gap-10 lg:gap-14">
        {steps.map((s, idx) => (
          <li key={s.key}>
            <span className="grid size-14 place-items-center rounded-xl bg-white text-primary shadow-sm">
              <s.icon size={26} aria-hidden />
            </span>
            <h3 className="mt-6 text-2xl font-semibold tracking-tight text-balance">
              {idx + 1}. {t(`${s.key}.title`)}
            </h3>
            <p className="mt-1.5 text-sm text-primary-foreground/60">
              {t(`${s.key}.subtitle`)}
            </p>
            <p className="mt-4 max-w-[46ch] leading-relaxed text-primary-foreground/80">
              {t(`${s.key}.description`)}
            </p>
          </li>
        ))}
      </ol>
    </Band>
  );
};

export default HowItWorks;
