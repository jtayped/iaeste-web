import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface UserRequestProps {
  name: string;
  email: string;
  requestLink: string;
}

export const UserRequest = ({ name, email, requestLink }: UserRequestProps) => {
  const previewText = `Verify your email (${email}) for the IAESTE Admin site. Verify at ${requestLink}`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">Algú es vol unir!</Heading>
      <Text>
        El/la <b>{name}</b> amb correu <u>{email}</u> es vol unir a IAESTE. Feu
        clic al següent botó per veure la seva sol·licitud:
      </Text>
      <Section>
        <Button
          href={requestLink}
          className="bg-blue-900 text-center rounded-lg text-white w-full py-3"
        >
          Veure sol·licitud
        </Button>
      </Section>
    </EmailWrapper>
  );
};

UserRequest.PreviewProps = {
  name: "John Doe",
  email: "john.doe@gmail.com",
  requestLink: "https://google.com",
} as UserRequestProps;

export default UserRequest;
