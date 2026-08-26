import { Link } from "@/i18n/routing";
import React from "react";
import { BiCode } from "react-icons/bi";
import { Button } from "@repo/ui/button";
import BackButton from "@repo/ui/back-btn";
import { useTranslations } from "next-intl";
import { H1, Paragraph } from "@repo/ui/typography";
import ButtonGroup from "@repo/ui/button-group";

const InDevelopment = () => {
  const t = useTranslations("UnderConstructionPage");

  return (
    <div className="flex h-screen w-full items-center justify-center bg-primary/50">
      <div className="section-padding flex max-w-screen-sm flex-col items-center text-center">
        <span className="bg-primary/30 p-4">
          <BiCode size={40} />
        </span>
        <H1 className="mt-6">{t("title")}</H1>
        <Paragraph>{t("description")}</Paragraph>
        <ButtonGroup className="mt-4">
          <Button asChild>
            <Link href={"/"}>{t("buttons.home")}</Link>
          </Button>
          <BackButton variant="secondary">{t("buttons.back")}</BackButton>
        </ButtonGroup>
      </div>
    </div>
  );
};

export default InDevelopment;
