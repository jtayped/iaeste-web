import React from "react";
import type { Metadata } from "next";

import Convit from "@/components/convit";

export const metadata: Metadata = {
  title: "convit a l'equip | iaeste lc lleida",
  // A single-use invitation link is not something to index, and the page is
  // useless without the token that never reaches the server anyway.
  robots: { index: false, follow: false },
};

/** Target of the link in the invitation email: `/convit#token=...`. */
const ConvitPage = () => <Convit />;

export default ConvitPage;
