import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import React from "react";

const LearnMoreBtn = ({
  text,
  icon = true,
  className = "",
}: {
  icon?: boolean;
  text?: string;
  className?: string;
}) => {
  const t = useTranslations("buttons");

  return (
    <Button asChild className={cn("mt-4", className)}>
      <Link
        href="https://iaeste.org"
        target="_blank" // Opens the link in a new tab
        rel="noopener noreferrer" // Security best practice
      >
        {text ? text : t("learn-more")} {icon && <ArrowUpRight />}
      </Link>
    </Button>
  );
};

export default LearnMoreBtn;
