import collaborators from "@/constants/collaborators";
import Image from "next/image";
import Section from "../common/sections/section";
import Link from "next/link";

const Collaborators = () => {
  return (
    <Section>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-5 items-center">
        {collaborators.map((c, i) => (
          <li key={i}>
            <Link
              href={c.href}
              target="_blank" // Opens the link in a new tab
              rel="noopener noreferrer" // Security best practice
            >
              <Image
                src={c.src}
                width={300}
                height={200}
                alt={c.name}
                className="h-20 object-contain"
              />
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
};

export default Collaborators;
