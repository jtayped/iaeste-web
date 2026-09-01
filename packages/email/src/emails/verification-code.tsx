import { Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface VerificationCodeProps {
  email: string;
  /** Six digits, optionally grouped with one space for easier reading. */
  code: string;
  /** Lifetime of the code, in minutes. Passed in so the copy cannot drift from the token actually issued. */
  expiresInMinutes: number;
}

/**
 * The first step of the registration form, not the last.
 *
 * A code rather than a link: the person is mid-form in another tab, and a
 * link would move them to a new one and lose everything they had typed. Six
 * digits can be read off a phone and typed back into the tab they are
 * already in.
 */
export const VerificationCode = ({
  email,
  code,
  expiresInMinutes,
}: VerificationCodeProps) => {
  const previewText = `el teu codi per continuar la inscripció és ${code}.`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">el teu codi d&apos;inscripció</Heading>
      <Text>
        fes servir aquest codi per continuar la inscripció a iaeste lc lleida:
      </Text>
      <Section>
        <Text className="my-2 rounded-lg bg-[#f4f4f5] py-4 text-center font-mono text-4xl font-bold tracking-[0.35em] text-blue-900">
          {code}
        </Text>
      </Section>
      <Text className="mb-0 text-xs">
        el codi caduca en {expiresInMinutes} minuts i només serveix per a{" "}
        <u>{email}</u>. si no has demanat inscriure&apos;t, ignora aquest
        correu: sense el codi ningú pot continuar.
      </Text>
    </EmailWrapper>
  );
};

VerificationCode.PreviewProps = {
  email: "john.doe@example.com",
  code: "418 502",
  expiresInMinutes: 10,
} as VerificationCodeProps;

export default VerificationCode;
