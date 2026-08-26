import Verify from "@/components/verify";
import type { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Verificant el correu | IAESTE LC Lleida",
  robots: { index: false, follow: false },
};

/** Target of the link in the verification email: `/verificar?token=...`. */
const VerifyPage = () => (
  <Suspense>
    <Verify />
  </Suspense>
);

export default VerifyPage;
