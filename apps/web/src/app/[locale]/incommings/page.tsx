import HeroSection from "@/components/common/sections/hero";
import Content from "@/components/common/sections/content";
import Apply from "@/components/sections/incommings/apply";
import City from "@/components/sections/incommings/city";
import Support from "@/components/sections/incommings/support";
import { heroImage } from "@/constants/lleida";
import { getTranslations } from "next-intl/server";

const IncommingsPage = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "IncommingPage.hero" });

  return (
    <>
      <HeroSection
        title={t("title")}
        subtitle={t("subtitle")}
        description={t("description")}
        backgroundImage={heroImage.src}
        /* The photograph is the point of this page, not a backdrop. */
        imageAlt={t("alt")}
        imagePosition="center 35%"
        credit={
          <>
            {t("credit")} {heroImage.credit.author},{" "}
            <a
              href={heroImage.credit.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary-foreground"
            >
              {heroImage.credit.license}
            </a>
          </>
        }
      />
      <Content>
        <City />
        <Support />
        <Apply />
      </Content>
    </>
  );
};

export default IncommingsPage;
