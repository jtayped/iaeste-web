import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface MembershipAcceptedProps {
  name: string;
  /** Page where the member can request a one-time sign-in link. */
  signInLink: string;
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
  signInLink,
  campaign,
  via = "registration",
}: MembershipAcceptedProps) => {
  const previewText = `ja ets membre de iaeste lc lleida el curs ${campaign}. inicia sessió per entrar al dashboard.`;

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
        per entrar al dashboard, fes servir el correu amb què ets al comitè.
        t&apos;hi enviarem un enllaç d&apos;accés d&apos;un sol ús.
      </Text>
      <Section>
        <Button
          href={signInLink}
          className="w-full rounded-lg bg-blue-900 py-3 text-center text-white"
        >
          iniciar sessió
        </Button>
      </Section>
      <Text>
        un cop hagis entrat, comprova que les teves dades siguin correctes.
      </Text>
    </EmailWrapper>
  );
};

MembershipAccepted.PreviewProps = {
  name: "John Doe",
  signInLink: "https://example.com/sign-in",
  campaign: "2026-2027",
  via: "registration",
} as MembershipAcceptedProps;

export default MembershipAccepted;
