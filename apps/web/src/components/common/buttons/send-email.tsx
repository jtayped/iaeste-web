import { buttonVariants } from "@repo/ui/button";
import { email } from "@/constants/contact";
import { cn } from "@repo/ui/lib/utils";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

/**
 * `mailto:` the committee.
 */
const SendEmailBtn = ({
  text,
  variant = "secondary",
  icon = true,
  size = "xl",
  className = "",
}: {
  text?: string;
  /** `onDarkSoft` on a navy band, `secondary` on the page. */
  variant?: "secondary" | "onDarkSoft";
  /** A leading icon separates two buttons in a row; a lone button is clearer
   *  without one, and "send an email" already says what the envelope says. */
  icon?: boolean;
  size?: "default" | "xl";
  className?: string;
}) => {
  const t = useTranslations("buttons");

  return (
    <a
      href={`mailto:${email}`}
      className={buttonVariants({ variant, size, className: cn(className) })}
    >
      {/* `LetterText` is a document glyph; `Mail` is the envelope this actually
          opens. */}
      {icon && <Mail aria-hidden />}
      {text ?? t("send-email")}
    </a>
  );
};

export default SendEmailBtn;
