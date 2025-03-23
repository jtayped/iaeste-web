import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface PasswordResetProps {
  email: string;
  link: string;
}

export const PasswordReset = ({ email, link }: PasswordResetProps) => {
  const previewText = `Change your password (${email}). Change at ${link}`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">Canvi de contrasenya</Heading>
      <Section>
        <Button
          href={link}
          className="bg-blue-900 text-center rounded-lg text-white w-full py-3"
        >
          Canviar contrasenya
        </Button>
      </Section>
      <Text className="text-xs mb-0">
        Fent clic amb aquest botó, sereu redireccionats a la pagina web per
        canviar la vostra contrasenya <u>({email})</u>.
      </Text>
    </EmailWrapper>
  );
};

PasswordReset.PreviewProps = {
  email: "john.doe@gmail.com",
  link: "https://google.com",
} as PasswordResetProps;

export default PasswordReset;
