import SuccessPageComponent from "@/components/success";
import { INSCRIPCIONS_STATE } from "@repo/constants/inscripcions";
import { notFound } from "next/navigation";
import React, { Suspense } from "react";

const SuccesPage = () => {
  if (INSCRIPCIONS_STATE != "on") return notFound();

  return (
    <Suspense>
      <SuccessPageComponent />
    </Suspense>
  );
};

export default SuccesPage;
