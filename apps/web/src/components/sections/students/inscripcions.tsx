import Section from "@/components/common/sections/section";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import React from "react";
import { INSCRIPCIONS_STATE } from "@repo/constants/inscripcions";

const Inscripcions = () => {
  const t = useTranslations("StudentsPage.registrations");

  if (INSCRIPCIONS_STATE !== "on") return;

  return (
    <Section className="flex justify-center bg-primary py-6">
      <Card className="flex flex-col md:flex-row items-center justify-between gap-4 w-full max-w-6xl">
        <div className="text-center md:text-left">
          <p className="text-3xl font-extrabold tracking-wide">{t("title")}</p>
          <p className="text-md mt-1 text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button className="mt-2 md:mt-0" asChild>
          <Link href={"https://inscripcions.iaestelleida.cat"}>
            {t("button")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </Card>
    </Section>
  );
};

export default Inscripcions;
