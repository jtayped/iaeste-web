import { buttonVariants } from "@repo/ui/button";
import { email } from "@/constants/contact";
import { cn } from "@repo/ui/lib/utils";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

/**
 * `mailto:` the committee. The icon is not optional any more — this button sat
 * beside `ContactFormBtn` in two heroes with the icon switched off, so the pair
 * read as two different kinds of control.
 */
const SendEmailBtn = ({
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
      href={`mailto:${email}`}
      className={buttonVariants({
        variant: "secondary",
        size,
        className: cn(className),
      })}
    >
      {/* `LetterText` is a document glyph; `Mail` is the envelope this actually
          opens. */}
      <Mail aria-hidden />
      {text ?? t("send-email")}
    </a>
  );
};

export default SendEmailBtn;
