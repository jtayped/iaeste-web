import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface MembershipAcceptedProps {
  name: string;
  /** First-login magic link. Personal and single use. */
  loginLink: string;
  /** Academic year the membership belongs to, e.g. `2026-2027`. */
  campaign: string;
  /**
   * How the person reached the membership. Only the opening line changes; the
   * first-login block below is identical for both paths.
   */
  via?: "registration" | "invitation";
}

export const MembershipAccepted = ({
  name,
  loginLink,
  campaign,
  via = "registration",
}: MembershipAcceptedProps) => {
  const previewText = `ja ets membre de iaeste lc lleida el curs ${campaign}. entra per primer cop al teu compte.`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">ja ets dels nostres!</Heading>
      <Text>hola {name},</Text>
      {via === "invitation" ? (
        <Text>
          has acceptat la invitació i ja ets membre de iaeste lc lleida el curs{" "}
          {campaign}.
        </Text>
      ) : (
        <Text>
          el comitè ha revisat la teva sol·licitud i l&apos;ha acceptada: ja ets
          membre de iaeste lc lleida el curs {campaign}.
        </Text>
      )}
      <Text>
        fes clic al següent botó per entrar per primer cop al teu compte:
      </Text>
      <Section>
        <Button
          href={loginLink}
          className="w-full rounded-lg bg-blue-900 py-3 text-center text-white"
        >
          entrar al meu compte
        </Button>
      </Section>
      <Text>
        un cop dins, comprova que les teves dades siguin correctes. si
        l&apos;enllaç ja no funciona, en pots demanar un de nou des de la pàgina
        d&apos;inici de sessió.
      </Text>
      <Text className="mb-0 text-xs">
        aquest enllaç és personal i d&apos;un sol ús: no el comparteixis amb
        ningú.
      </Text>
    </EmailWrapper>
  );
};

MembershipAccepted.PreviewProps = {
  name: "John Doe",
  loginLink: "https://example.com/entrar",
  campaign: "2026-2027",
  via: "registration",
} as MembershipAcceptedProps;

export default MembershipAccepted;
