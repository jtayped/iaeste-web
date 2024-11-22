import { useTranslations } from "next-intl";
import ContactForm from "../common/contact-form";
import socials from "@/constants/socials";
import Social from "../ui/social";

const Contact = () => {
  const t = useTranslations("contact");
  
  return (
    <div className="px-screen grid md:grid-cols-2 gap-10 mt-14">
      <div>
        <h2 className="text-3xl font-bold">{t("title")}</h2>
        <p className="text-muted-foreground mt-3">{t("description")}</p>
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          {socials.map((s) => (
            <li key={s.name}>
              <Social name={s.name} href={s.href} Icon={s.icon} />
            </li>
          ))}
        </ul>
      </div>
      <ContactForm />
    </div>
  );
};

export default Contact;
