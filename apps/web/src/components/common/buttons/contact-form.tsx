import { buttonVariants } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { type LucideIcon, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import React from "react";

/**
 * Scrolls to the contact form on the same page, so it is only ever rendered on
 * a page that mounts one.
 *
 * `onDark` by default: both call sites are heroes, and `default` is the same
 * navy as the overlay behind it — the button was disappearing into its own
 * background. This is the pairing the home hero already uses, a white plate
 * beside the blue secondary.
 *
 * No margin of its own: a button that carries `mt-4` cannot sit in a row
 * without pushing itself out of alignment with the button beside it, which is
 * what every `ButtonGroup` on the site was working around.
 */
const ContactFormBtn = ({
  icon: Icon,
  text,
  variant = "onDark",
  size = "xl",
  className = "",
}: {
  icon?: LucideIcon;
  text?: string;
  variant?: "default" | "onDark";
  size?: "default" | "xl";
  className?: string;
}) => {
  const t = useTranslations("buttons");

  return (
    <Link
      href="#contact-form"
      className={buttonVariants({ variant, size, className: cn(className) })}
    >
      {/* Leading icon: it names the kind of action. */}
      {Icon ? <Icon aria-hidden /> : <Send aria-hidden />}
      {text ?? t("contact-form")}
    </Link>
  );
};

export default ContactFormBtn;
