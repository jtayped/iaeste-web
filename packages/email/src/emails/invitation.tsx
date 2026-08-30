import { Button, Heading, Section, Text } from "@react-email/components";
import EmailWrapper from "./wrapper";

interface InviteUserProps {
  email: string;
  invitationLink: string;
}

export const UserInvitation = ({ email, invitationLink }: InviteUserProps) => {
  const previewText = `t'hem convidat a unir-te a iaeste lc lleida amb aquest correu (${email}).`;

  return (
    <EmailWrapper previewText={previewText}>
      <Heading className="mt-4">t&apos;hem convidat a l&apos;equip</Heading>
      <Text>hola,</Text>
      <Text>
        des de iaeste lc lleida t&apos;convidem a unir-te a l&apos;equip. fes
        clic al botó i acaba d&apos;omplir les teves dades: com que ja
        t&apos;hem convidat, no hauràs d&apos;esperar cap revisió.
      </Text>
      <Section>
        <Button
          href={invitationLink}
          className="w-full rounded-lg bg-blue-900 py-3 text-center text-white"
        >
          completa la inscripció
        </Button>
      </Section>
      <Text>tenim moltes ganes de tenir-te a l&apos;equip!</Text>
      <Text>ja ens veurem!</Text>
    </EmailWrapper>
  );
};

UserInvitation.PreviewProps = {
  email: "john.doe@example.com",
  invitationLink: "https://example.com/invitacio",
} as InviteUserProps;

export default UserInvitation;
