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

interface VercelInviteUserEmailProps {
  email: string;
  link: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "/static";

export const VercelInviteUserEmail = ({
  email,
  link,
}: VercelInviteUserEmailProps) => {
  const previewText = `Verify your email (${email}) for the IAESTE Admin site. Verify at ${link}`;

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
            <Heading className="mt-4">Verifica el teu correu!</Heading>
            <Section>
              <Button
                href={link}
                className="bg-blue-900 text-center rounded-lg text-white w-full py-3"
              >
                Verifica
              </Button>
            </Section>
            <Text className="text-xs mb-0">
              Fent clic amb aquest botó, sereu redireccionats a la pagina web
              per verificar el vostre correu <u>({email})</u>.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

VercelInviteUserEmail.PreviewProps = {
  email: "john.doe@gmail.com",
  link: "https://google.com",
} as VercelInviteUserEmailProps;

export default VercelInviteUserEmail;
