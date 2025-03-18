import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface InviteUserProps {
  email: string;
  invitationLink: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://iaeste-lleida.vercel.app";

export const UserInvitation = ({ email, invitationLink }: InviteUserProps) => {
  const previewText = `Verify your email (${email}) for the IAESTE Admin site. Verify at ${invitationLink}`;

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans px-2">
          <Preview>{previewText}</Preview>
          <Container className="border border-solid border-[#eaeaea] rounded-xl my-[30px] mx-auto p-[20px] max-w-[465px]">
            <Section>
              <Img src={`${baseUrl}/logos/icon-lleida-blue.png`} height={80} />
            </Section>
            <Heading className="mt-4">Benvingut a IAESTE!</Heading>
            <Text>Bonessss,</Text>
            <Text>
              Des de IAESTE LC Lleida, t&apos;invitem a que t&apos;uneixis al
              nostre equip! Fent clic al següent botó, sereu redireccionats a la
              nostra pàgina web per acabar de registrar-te.
            </Text>
            <Section>
              <Button
                href={invitationLink}
                className="bg-blue-900 text-center rounded-lg text-white w-full py-3"
              >
                Registra&apos;t
              </Button>
            </Section>
            <Text>Tenim moltes ganes de tenir-te al nostre equip!</Text>
            <Text>Ja ens veurem ;)</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

UserInvitation.PreviewProps = {
  email: "john.doe@gmail.com",
  invitationLink: "https://google.com",
} as InviteUserProps;

export default UserInvitation;
