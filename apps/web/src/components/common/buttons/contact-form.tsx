import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <Button asChild variant="default" className={cn("mt-4", className)}>
      <Link href="#contact-form">
        {Icon ? <Icon /> : <Send />}
        {text ?? t("contact-form")}
      </Link>
    </Button>
  );
};

export default ContactFormBtn;
