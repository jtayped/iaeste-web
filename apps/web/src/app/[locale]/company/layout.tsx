import { generatePageMetadata } from "@/lib/metadata";
import { Metadata } from "next";

export function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return generatePageMetadata({ params, pageKey: "CompanyPage" });
}

const CompanyLayout = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>;
};

export default CompanyLayout;
