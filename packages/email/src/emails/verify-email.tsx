import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface VerifyUserEmailProps {
  email: string;
  link: string;
}

export const VerifyUserEmail = ({ email, link }: VerifyUserEmailProps) => {
  const previewText = `confirma que aquest correu (${email}) és teu per continuar amb la inscripció.`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">verifica el teu correu</Heading>
      <Section>
        <Button
          href={link}
          className="w-full rounded-lg bg-blue-900 py-3 text-center text-white"
        >
          verificar el correu
        </Button>
      </Section>
      <Text className="mb-0 text-xs">
        fent clic al botó aniràs a la pàgina web per verificar el teu correu{" "}
        <u>({email})</u>.
      </Text>
    </EmailWrapper>
  );
};

VerifyUserEmail.PreviewProps = {
  email: "john.doe@example.com",
  link: "https://example.com/verificar",
} as VerifyUserEmailProps;

export default VerifyUserEmail;
