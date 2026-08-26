import PendingVerification from "@/components/pending-verification";
import type { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Verifica el teu correu | IAESTE LC Lleida",
  robots: { index: false, follow: false },
};

// No `NEXT_PUBLIC_INSCRIPCIONS_STATE` guard here or on any of the other flow
// screens: someone who registered on the last day still has to be able to
// verify, and read what happens next, after the campaign closes.
const PendingVerificationPage = () => (
  <Suspense>
    <PendingVerification />
  </Suspense>
);

export default PendingVerificationPage;
