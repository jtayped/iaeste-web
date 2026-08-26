import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface InviteUserProps {
  email: string;
  invitationLink: string;
}

export const UserInvitation = ({ email, invitationLink }: InviteUserProps) => {
  const previewText = `T'hem convidat a unir-te a IAESTE LC Lleida amb aquest correu (${email}).`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">Benvingut a IAESTE!</Heading>
      <Text>Bonessss,</Text>
      <Text>
        Des de IAESTE LC Lleida, t&apos;invitem a que t&apos;uneixis al nostre
        equip! Fent clic al següent botó, sereu redireccionats a la nostra
        pàgina web per acabar de registrar-te.
      </Text>
      <Section>
        <Button
          href={invitationLink}
          className="w-full rounded-lg bg-blue-900 py-3 text-center text-white"
        >
          Registra&apos;t
        </Button>
      </Section>
      <Text>Tenim moltes ganes de tenir-te al nostre equip!</Text>
      <Text>Ja ens veurem ;)</Text>
    </EmailWrapper>
  );
};

UserInvitation.PreviewProps = {
  email: "john.doe@example.com",
  invitationLink: "https://example.com/invitacio",
} as InviteUserProps;

export default UserInvitation;
