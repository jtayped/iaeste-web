import collaborators from "@/constants/collaborators";
import Image from "next/image";
import Section from "../common/sections/section";
import { useTranslations } from "next-intl";

const Collaborators = () => {
  const t = useTranslations("collaborators");

  return (
    <Section>
      <h2 className="text-center text-sm font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {t("title")}
      </h2>
      <ul className="mt-8 grid grid-cols-2 items-center gap-x-10 gap-y-8 md:grid-cols-4">
        {collaborators.map((c) => (
          <li key={c.name}>
            <a
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {/* The link used to carry an `aria-label` and the image a matching
                  `alt`, so every partner was announced twice. */}
              <Image
                src={c.src}
                width={300}
                height={200}
                alt={c.name}
                className="h-14 w-full object-contain opacity-80 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 md:h-16"
              />
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
};

export default Collaborators;
