import SuccessPageComponent from "@/components/success";
import React, { Suspense } from "react";

const SuccesPage = () => {
  return (
    <Suspense>
      <SuccessPageComponent />
    </Suspense>
  );
};

export default SuccesPage;
