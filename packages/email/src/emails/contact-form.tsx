import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface ContactFormProps {
  email: string;
  name: string;
  subject: string;
  message: string;
  lastname: string;
}

export const ContactFormEmail = ({
  email,
  name,
  lastname,
  subject,
  message,
}: ContactFormProps) => {
  const previewText = `algú ha fet servir el formulari de contacte de la web.`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">nou missatge</Heading>
      <Text>hola,</Text>
      <Text>
        <b>
          {name} {lastname}
        </b>{" "}
        ha fet servir el formulari de la web i ha enviat aquest missatge:
      </Text>
      <blockquote>
        <p className="mb-0 text-lg">
          <b>{subject}</b>
        </p>
        <p className="mt-2">
          <i className="mt-3">{message}</i>
        </p>
      </blockquote>
      <Section>
        <Button
          href={`mailto:${email}`}
          className="w-full rounded-lg bg-blue-900 py-3 text-center text-white"
        >
          contestar {name}
        </Button>
      </Section>
      <Text>
        correu: <u>{email}</u>
      </Text>
    </EmailWrapper>
  );
};

ContactFormEmail.PreviewProps = {
  email: "john.doe@example.com",
  name: "John",
  lastname: "Doe",
  subject: "Lorem ipsum dolor.",
  message: "Lorem ipsum dolor sit amet.",
} as ContactFormProps;

export default ContactFormEmail;
