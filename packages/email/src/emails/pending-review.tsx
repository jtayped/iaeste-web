import { Heading, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface RegistrationPendingProps {
  name: string;
  email: string;
  /** Academic year the registration belongs to, e.g. `2026-2027`. */
  campaign: string;
}

export const RegistrationPending = ({
  name,
  email,
  campaign,
}: RegistrationPendingProps) => {
  const previewText = `hem rebut la teva sol·licitud per al curs ${campaign}. ara la revisa el comitè.`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">sol·licitud rebuda!</Heading>
      <Text>hola {name},</Text>
      <Text>
        ja hem verificat el teu correu <u>({email})</u> i la teva sol·licitud
        per unir-te a iaeste lc lleida el curs {campaign} ha quedat registrada.
      </Text>
      <Text>
        <b>verificar el correu no et fa membre.</b> ara el comitè ha de revisar
        la teva sol·licitud, i fins que no l&apos;accepti no podràs iniciar
        sessió ni tindràs cap compte actiu.
      </Text>
      <Text>
        t&apos;escriurem a aquest mateix correu amb la resposta, sigui quina
        sigui. no cal que facis res més.
      </Text>
      <Text>gràcies per l&apos;interès!</Text>
    </EmailWrapper>
  );
};

RegistrationPending.PreviewProps = {
  name: "John Doe",
  email: "john.doe@example.com",
  campaign: "2026-2027",
} as RegistrationPendingProps;

export default RegistrationPending;
