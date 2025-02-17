import collaborators from "@/constants/collaborators";
import Image from "next/image";
import Section from "../common/sections/section";

const Collaborators = () => {
  return (
    <Section>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-5 items-center">
        {collaborators.map((c, i) => (
          <li key={i}>
            <Image
              src={c.src}
              width={300}
              height={200}
              alt={c.name}
              className="h-20 object-contain"
            />
          </li>
        ))}
      </ul>
    </Section>
  );
};

export default Collaborators;
