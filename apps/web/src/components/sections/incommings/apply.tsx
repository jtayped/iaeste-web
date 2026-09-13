import Band from "@/components/common/sections/band";
import { email } from "@/constants/contact";
import { buttonVariants } from "@repo/ui/button";
import { H2 } from "@repo/ui/typography";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

/**
 * The page's one conversion moment, and the honest one: a placement in Lleida
 * is applied for through the student's own national committee, not here. The
 * committee's own address is the secondary route, for someone already placed.
 */
const Apply = () => {
  const t = useTranslations("IncommingPage.apply");
  const tb = useTranslations("buttons");

  return (
    <Band innerClassName="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-14">
      <div>
        <H2 className="md:text-4xl">{t("title")}</H2>
        <p className="mt-4 max-w-[58ch] leading-relaxed text-primary-foreground/80">
          {t("description")}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-4">
        <a
          href="https://iaeste.org/countries"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({
            variant: "onDark",
            size: "xl",
            className: "w-full",
          })}
        >
          {t("button")}
          <ArrowUpRight aria-hidden />
          <span className="sr-only">{tb("opens-new-tab")}</span>
        </a>
        <p className="max-w-[34ch] text-sm text-primary-foreground/70">
          {t("contactNote")}{" "}
          <a
            href={`mailto:${email}`}
            className="font-semibold underline underline-offset-4 hover:text-primary-foreground"
          >
            {email}
          </a>
        </p>
      </div>
    </Band>
  );
};

export default Apply;
