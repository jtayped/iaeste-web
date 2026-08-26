import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface SignInMagicLinkProps {
  email: string;
  link: string;
  /**
   * Lifetime of the link, in minutes. Required rather than defaulted so the
   * copy always matches the token the caller actually issued.
   */
  expiresInMinutes: number;
}

export const SignInMagicLink = ({
  email,
  link,
  expiresInMinutes,
}: SignInMagicLinkProps) => {
  const previewText = `enllaç per iniciar sessió a iaeste. caduca en ${expiresInMinutes} minuts.`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">el teu enllaç d&apos;accés</Heading>
      <Section>
        <Button
          href={link}
          className="w-full rounded-lg bg-blue-900 py-3 text-center text-white"
        >
          iniciar sessió
        </Button>
      </Section>
      <Text className="mb-0 text-xs">
        aquest enllaç caduca en {expiresInMinutes} minuts i només serveix per al
        correu <u>({email})</u>. si no has demanat iniciar sessió, ignora aquest
        correu.
      </Text>
    </EmailWrapper>
  );
};

SignInMagicLink.PreviewProps = {
  email: "john.doe@example.com",
  link: "https://example.com/entrar",
  expiresInMinutes: 10,
} as SignInMagicLinkProps;

export default SignInMagicLink;
