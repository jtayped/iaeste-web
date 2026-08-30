import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface UserRequestProps {
  name: string;
  email: string;
  requestLink: string;
}

export const UserRequest = ({ name, email, requestLink }: UserRequestProps) => {
  const previewText = `${name} (${email}) vol unir-se a iaeste lc lleida.`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">algú es vol unir</Heading>
      <Text>
        {name}, amb correu <u>{email}</u>, es vol unir a iaeste. fes clic al
        botó per veure la sol·licitud:
      </Text>
      <Section>
        <Button
          href={requestLink}
          className="w-full rounded-lg bg-blue-900 py-3 text-center text-white"
        >
          veure la sol·licitud
        </Button>
      </Section>
    </EmailWrapper>
  );
};

UserRequest.PreviewProps = {
  name: "John Doe",
  email: "john.doe@example.com",
  requestLink: "https://example.com/sol-licituds",
} as UserRequestProps;

export default UserRequest;
