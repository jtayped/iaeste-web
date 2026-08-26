import { Heading, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface InvitationCancelledProps {
  email: string;
  /** Why the invitation link stopped working. */
  reason: "cancelled" | "expired";
}

export const InvitationCancelled = ({
  email,
  reason,
}: InvitationCancelledProps) => {
  const previewText =
    reason === "expired"
      ? "la invitació per unir-te a iaeste ha caducat."
      : "hem cancel·lat la invitació per unir-te a iaeste.";

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">la invitació ja no és vàlida</Heading>
      <Text>hola,</Text>
      {reason === "expired" ? (
        <Text>
          la invitació que vam enviar a <u>{email}</u> per unir-te a iaeste lc
          lleida ha caducat, i l&apos;enllaç del correu anterior ja no funciona.
        </Text>
      ) : (
        <Text>
          hem cancel·lat la invitació que vam enviar a <u>{email}</u> per
          unir-te a iaeste lc lleida, i l&apos;enllaç del correu anterior ja no
          funciona.
        </Text>
      )}
      <Text>
        si continues volent formar part de l&apos;equip, respon a aquest correu
        i te&apos;n tornem a enviar una de nova.
      </Text>
      <Text>disculpa les molèsties!</Text>
    </EmailWrapper>
  );
};

InvitationCancelled.PreviewProps = {
  email: "john.doe@example.com",
  reason: "expired",
} as InvitationCancelledProps;

export default InvitationCancelled;
