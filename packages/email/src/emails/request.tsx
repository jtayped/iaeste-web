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

interface UserRequestProps {
  name: string;
  email: string;
  requestLink: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://iaeste-lleida.vercel.app";

export const UserRequest = ({ name, email, requestLink }: UserRequestProps) => {
  const previewText = `Verify your email (${email}) for the IAESTE Admin site. Verify at ${requestLink}`;

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
            <Heading className="mt-4">Algú es vol unir!</Heading>
            <Text>
              El/la <b>{name}</b> amb correu <u>{email}</u> es vol unir a
              IAESTE. Feu clic al següent botó per veure la seva sol·licitud:
            </Text>
            <Section>
              <Button
                href={requestLink}
                className="bg-blue-900 text-center rounded-lg text-white w-full py-3"
              >
                Veure sol·licitud
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

UserRequest.PreviewProps = {
  name: "John Doe",
  email: "john.doe@gmail.com",
  requestLink: "https://google.com",
} as UserRequestProps;

export default UserRequest;
