import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper.js";

interface VerifyUserEmailProps {
  email: string;
  link: string;
}

export const VerifyUserEmail = ({ email, link }: VerifyUserEmailProps) => {
  const previewText = `Verify your email (${email}) for the IAESTE Admin site. Verify at ${link}`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">Verifica el teu correu!</Heading>
      <Section>
        <Button
          href={link}
          className="bg-blue-900 text-center rounded-lg text-white w-full py-3"
        >
          Verificar
        </Button>
      </Section>
      <Text className="text-xs mb-0">
        Fent clic amb aquest botó, sereu redireccionats a la pagina web per
        verificar el vostre correu <u>({email})</u>.
      </Text>
    </EmailWrapper>
  );
};

VerifyUserEmail.PreviewProps = {
  email: "john.doe@gmail.com",
  link: "https://google.com",
} as VerifyUserEmailProps;

export default VerifyUserEmail;
