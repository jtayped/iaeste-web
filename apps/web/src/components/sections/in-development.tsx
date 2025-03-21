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
    <div className="flex items-center justify-center w-full h-screen bg-primary/50">
      <div className="flex flex-col items-center text-center max-w-screen-sm section-padding">
        <span className="p-4 bg-primary/30">
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
