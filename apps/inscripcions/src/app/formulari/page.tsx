import UserForm from "@/components/form";
import StatusScreen from "@/components/status";
import { getRegistrationAvailability } from "@/lib/registration-status";
import { Button } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

const FormPage = async () => {
  const availability = await getRegistrationAvailability();

  if (availability === "closed") redirect("/inscripcions-tancades");

  if (availability === "unavailable") {
    return (
      <StatusScreen
        icon="warning"
        tone="warning"
        title="no podem comprovar les inscripcions"
        actions={
          <Button asChild>
            <Link href="/formulari">torna-ho a provar</Link>
          </Button>
        }
      >
        <Paragraph>
          no hem pogut connectar amb el servidor. comprova la connexió i
          torna-ho a provar d&apos;aquí a un moment.
        </Paragraph>
      </StatusScreen>
    );
  }

  return <UserForm />;
};

export default FormPage;
