import { Heading, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface MembershipRejectedProps {
  name: string;
  /** Academic year the registration belonged to, e.g. `2026-2027`. */
  campaign: string;
  /** Optional note written by the admin who rejected the registration. */
  reason?: string;
}

export const MembershipRejected = ({
  name,
  campaign,
  reason,
}: MembershipRejectedProps) => {
  const previewText = `resposta a la teva sol·licitud per unir-te a iaeste el curs ${campaign}.`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">sobre la teva sol·licitud</Heading>
      <Text>hola {name},</Text>
      <Text>
        el comitè ha revisat la teva sol·licitud per unir-te a iaeste lc lleida
        i aquest cop no l&apos;hem pogut acceptar per al curs {campaign}.
      </Text>
      {reason ? (
        <blockquote>
          <p className="mt-2">
            <i>{reason}</i>
          </p>
        </blockquote>
      ) : null}
      <Text>
        no et desanimis: pots tornar a presentar la teva sol·licitud quan obrim
        les inscripcions del proper curs.
      </Text>
      <Text>
        si tens qualsevol dubte, respon a aquest correu i te&apos;l resolem.
      </Text>
      <Text>gràcies per l&apos;interès i molta sort!</Text>
    </EmailWrapper>
  );
};

MembershipRejected.PreviewProps = {
  name: "John Doe",
  campaign: "2026-2027",
  reason: "Lorem ipsum dolor sit amet.",
} as MembershipRejectedProps;

export default MembershipRejected;
