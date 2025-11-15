import SuccessPageComponent from "@/components/success";
import { notFound } from "next/navigation";
import React, { Suspense } from "react";

const INSCRIPCIONS_STATE = process.env.INSCRIPCIONS_STATE as "on" | "off";

const SuccesPage = () => {
  if (INSCRIPCIONS_STATE != "on") return notFound();

  return (
    <Suspense>
      <SuccessPageComponent />
    </Suspense>
  );
};

export default SuccesPage;
