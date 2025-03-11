import { Button } from "@/components/ui/button";
import { email } from "@/constants/contact";
import { cn } from "@/lib/utils";
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
    <Button asChild variant="secondary" className={cn("mt-4", className)}>
      <Link href={`mailto:${email}`}>
        {icon && <LetterText />}
        {text ?? t("send-email")}
      </Link>
    </Button>
  );
};

export default SendEmailBtn;
