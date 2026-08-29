import AlreadyRegistered from "@/components/already-registered";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "ja estàs inscrit | iaeste lc lleida",
  robots: { index: false, follow: false },
};

const AlreadyRegisteredPage = () => <AlreadyRegistered />;

export default AlreadyRegisteredPage;
