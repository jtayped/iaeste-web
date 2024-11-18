import { useTranslations } from "next-intl";
import Image from "next/image";
import { BiMap } from "react-icons/bi";

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
      <div className="h-[90vh] flex justify-center items-center bg-primary/50 text-white">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-8xl font-extrabold">{t("title")}</h1>
          <div className="flex items-center gap-1 text-lg">
            <BiMap />
            <p>Lleida</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
