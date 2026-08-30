import { buttonVariants } from "@repo/ui/button";
import { email } from "@/constants/contact";
import { cn } from "@repo/ui/lib/utils";
import { LetterText } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import React from "react";

const SendEmailBtn = ({
  text,
  icon = false,
  className = "",
}: {
  icon?: boolean;
  text?: string;
  className?: string;
}) => {
  const t = useTranslations("buttons");

  return (
    <Link
      href={`mailto:${email}`}
      className={buttonVariants({
        variant: "secondary",
        className: cn("mt-4", className),
      })}
    >
      {icon && <LetterText />}
      {text ?? t("send-email")}
    </Link>
  );
};

export default SendEmailBtn;
