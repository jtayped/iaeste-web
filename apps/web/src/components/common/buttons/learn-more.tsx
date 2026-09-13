import { buttonVariants } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

/**
 * Off to iaeste.org. The trailing `ArrowUpRight` is the site's mark for "this
 * leaves the site" and is no longer optional, because without it this was an
 * unannounced new tab on two pages.
 *
 * `outline` keeps it subordinate to the page's own call to action — it used to
 * be a solid navy `default`, which made the loudest button in two sections the
 * one that sends people off the site. The size is the same `xl` as every other
 * in-body CTA: the site runs two button scales, 36px in the header and 48px in
 * the page, and nothing should sit between them.
 */
const LearnMoreBtn = ({
  text,
  size = "xl",
  className = "",
}: {
  text?: string;
  size?: "default" | "xl";
  className?: string;
}) => {
  const t = useTranslations("buttons");

  return (
    <a
      href="https://iaeste.org"
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({
        variant: "outline",
        size,
        className: cn(className),
      })}
    >
      {text ?? t("learn-more")}
      <ArrowUpRight aria-hidden />
      <span className="sr-only">{t("opens-new-tab")}</span>
    </a>
  );
};

export default LearnMoreBtn;
