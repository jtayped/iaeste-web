import { useTranslations } from "next-intl";
import ContactForm from "../common/contact-form";
import socials from "@/constants/socials";
import { Button } from "../ui/button";
import { BiSend } from "react-icons/bi";
import Link from "next/link";

const Contact = () => {
  const t = useTranslations("contact");

  return (
    <div className="px-screen grid md:grid-cols-2 gap-10 mt-14">
      <div>
        <div className="flex items-center gap-3.5">
          <h2 className="text-3xl font-bold">{t("title")}</h2>
          <ul className="flex items-center gap-2">
            {socials.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.name}>
                  <Link href={s.href}>
                    <Icon size={25} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-lg mt-3">{t("description")}</p>
        <Link href="mailto:iaeste@udl.cat">
          <Button className="mt-5">
            {t("btn")} <BiSend />
          </Button>
        </Link>
      </div>
      <ContactForm />
    </div>
  );
};

export default Contact;
