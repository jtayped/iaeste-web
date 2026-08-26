import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface VerifyUserEmailProps {
  email: string;
  link: string;
}

export const VerifyUserEmail = ({ email, link }: VerifyUserEmailProps) => {
  const previewText = `Confirma que aquest correu (${email}) és teu per continuar amb la inscripció.`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">Verifica el teu correu!</Heading>
      <Section>
        <Button
          href={link}
          className="w-full rounded-lg bg-blue-900 py-3 text-center text-white"
        >
          Verificar
        </Button>
      </Section>
      <Text className="mb-0 text-xs">
        Fent clic amb aquest botó, sereu redireccionats a la pagina web per
        verificar el vostre correu <u>({email})</u>.
      </Text>
    </EmailWrapper>
  );
};

VerifyUserEmail.PreviewProps = {
  email: "john.doe@example.com",
  link: "https://example.com/verificar",
} as VerifyUserEmailProps;

export default VerifyUserEmail;
