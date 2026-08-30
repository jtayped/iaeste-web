import React from "react";
import type { Metadata } from "next";

import RegistrationFlow from "@/components/registration";

export const metadata: Metadata = {
  title: "convit a l'equip | iaeste lc lleida",
  // A single-use invitation link is not something to index, and the page is
  // useless without the token that never reaches the server anyway.
  robots: { index: false, follow: false },
};

/**
 * Target of the link in the invitation email: `/convit#token=…`.
 *
 * The same component `/formulari` renders, in invitation mode. An invited
 * person skips the email and code steps — the token already proves the
 * address — and lands on the details step looking at exactly the page a
 * public applicant reaches after theirs.
 *
 * The path stays `/convit` because invitation links already sent point here.
 */
const ConvitPage = () => <RegistrationFlow mode={{ kind: "invitation" }} />;

export default ConvitPage;
