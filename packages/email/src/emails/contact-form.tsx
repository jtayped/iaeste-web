import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface ContactFormProps {
  email: string;
  name: string;
  subject: string;
  message: string;
}

export const ContactFormEmail = ({
  email,
  name,
  subject,
  message,
}: ContactFormProps) => {
  const previewText = `Algú ha fet servir el formulari de contacte de la web!`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">Nou missatge</Heading>
      <Text>Holaaaa,</Text>
      <Text>
        El/la <b>{name}</b> ha fet servir el formulari de la web. Ha enviat el
        següent missatge:
      </Text>
      <blockquote>
        <p className="text-lg mb-0">
          <b>{subject}</b>
        </p>
        <p className="mt-2">
          <i className="mt-3">{message}</i>
        </p>
      </blockquote>
      <Section>
        <Button
          href={`mailto:${email}`}
          className="bg-blue-900 text-center rounded-lg text-white w-full py-3"
        >
          Contestar el/la {name}
        </Button>
      </Section>
      <Text>
        Correu: <u>{email}</u>
      </Text>
    </EmailWrapper>
  );
};

ContactFormEmail.PreviewProps = {
  email: "john.doe@gmail.com",
  name: "John Doe",
  subject: "Lorem ipsum dolor.",
  message: "Lorem ipsum dolor sit amet.",
} as ContactFormProps;

export default ContactFormEmail;
