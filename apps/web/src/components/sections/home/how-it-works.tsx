import Section from "@/components/common/sections/section";
import { H2, H3 } from "@repo/ui/typography";
import steps from "@/constants/how-it-works";
import { useTranslations } from "next-intl";

const HowItWorks = () => {
  const t = useTranslations("HomePage.steps");

  return (
    <Section className="bg-primary py-16 text-primary-foreground md:py-24">
      <H2>{t("title")}</H2>
      <ol className="mt-12 grid grid-cols-1 gap-12 md:mt-16 md:grid-cols-3 md:gap-10 lg:gap-14">
        {steps.map((s, idx) => (
          <li key={s.key}>
            {/* The tile was a 60px glyph in 12px of padding, which made it
                the largest thing in the column. Sized to the type instead. */}
            <span className="grid size-14 place-items-center rounded-xl bg-white text-primary shadow-sm">
              <s.icon size={26} aria-hidden />
            </span>
            <H3 className="mt-6">
              {idx + 1}. {t(`${s.key}.title`)}
            </H3>
            {/* Already written and translated in all three locales, but the
                section never rendered it. */}
            <p className="mt-1.5 text-sm text-primary-foreground/60">
              {t(`${s.key}.subtitle`)}
            </p>
            <p className="mt-4 max-w-[46ch] leading-relaxed text-primary-foreground/80">
              {t(`${s.key}.description`)}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
};

export default HowItWorks;
