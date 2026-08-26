import SuccessPageComponent from "@/components/success";
import { env } from "@repo/env/inscripcions";
import { notFound } from "next/navigation";
import React, { Suspense } from "react";

const SuccesPage = () => {
  if (env.NEXT_PUBLIC_INSCRIPCIONS_STATE !== "on") return notFound();

  return (
    <Suspense>
      <SuccessPageComponent />
    </Suspense>
  );
};

export default SuccesPage;
