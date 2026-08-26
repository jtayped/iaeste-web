import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface InviteUserProps {
  email: string;
  invitationLink: string;
}

export const UserInvitation = ({ email, invitationLink }: InviteUserProps) => {
  const previewText = `Verify your email (${email}) for the IAESTE Admin site. Verify at ${invitationLink}`;

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
  email: "john.doe@gmail.com",
  invitationLink: "https://google.com",
} as InviteUserProps;

export default UserInvitation;
