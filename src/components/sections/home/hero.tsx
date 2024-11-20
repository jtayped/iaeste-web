import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Image from "next/image";

const Hero = () => {
  const t = useTranslations("HomePage.hero");

  return (
    <div className="relative">
      <Image
        src={"/hero.jpg"}
        width={768}
        height={1200}
        alt="Hero background"
        className="absolute w-full h-full object-cover -z-10"
      />
      <div className="h-screen flex justify-center items-center bg-primary/60 text-white px-screen">
        <div className="flex flex-col items-center text-center max-w-3xl">
          <h1 className="text-6xl lg:text-8xl font-extrabold">
            IAESTE
            <span className="text-xl font-semibold">LLEIDA</span>
          </h1>
          <p className="text-sm md:text-md">{t("description")}</p>
          <div className="flex items-center gap-3 mt-5">
            <Button variant={"default"} size={"lg"}>
              {t("buttons.student")}
            </Button>
            <Button variant={"secondary"} size={"lg"}>
              {t("buttons.company")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
