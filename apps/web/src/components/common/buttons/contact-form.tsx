import { buttonVariants } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { type LucideIcon, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import React from "react";

const ContactFormBtn = ({
  icon: Icon,
  text,
  className = "",
}: {
  icon?: LucideIcon;
  text?: string;
  className?: string;
}) => {
  const t = useTranslations("buttons");

  return (
    <Link
      href="#contact-form"
      className={buttonVariants({
        variant: "default",
        className: cn("mt-4", className),
      })}
    >
      {Icon ? <Icon /> : <Send />}
      {text ?? t("contact-form")}
    </Link>
  );
};

export default ContactFormBtn;
