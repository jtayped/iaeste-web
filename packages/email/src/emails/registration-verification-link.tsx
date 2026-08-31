import { Button, Heading, Section, Text } from "@react-email/components";

import type { MemberEmailKind } from "@repo/constants/validators/member-email";

import EmailWrapper from "./wrapper";

interface RegistrationVerificationLinkProps {
  email: string;
  kind: MemberEmailKind;
  link: string;
  expiresInDays: number;
}

export const RegistrationVerificationLink = ({
  email,
  kind,
  link,
  expiresInDays,
}: RegistrationVerificationLinkProps) => {
  const label = kind === "university" ? "universitari" : "personal";
  return (
    <EmailWrapper
      previewText={`confirma el teu correu ${label} per continuar la inscripció.`}
    >
      <Heading className="mt-4">confirma el correu {label}</Heading>
      <Text>
        hem rebut una inscripció amb el correu <u>{email}</u>. confirma que és
        teu per continuar.
      </Text>
      <Section className="my-8 text-center">
        <Button
          href={link}
          className="rounded-md bg-[#00529f] px-5 py-3 text-white"
        >
          confirma aquest correu
        </Button>
      </Section>
      <Text>
        l&apos;enllaç caduca en {expiresInDays} dies. hauràs de confirmar també
        l&apos;altre correu abans d&apos;enviar la inscripció. si no l&apos;has
        començada tu, ignora aquest missatge.
      </Text>
    </EmailWrapper>
  );
};

RegistrationVerificationLink.PreviewProps = {
  email: "joan@example.com",
  kind: "personal",
  link: "https://inscripcions.example.com/formulari#token=example",
  expiresInDays: 7,
} as RegistrationVerificationLinkProps;

export default RegistrationVerificationLink;
