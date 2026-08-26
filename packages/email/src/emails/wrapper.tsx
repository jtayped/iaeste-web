import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import React from "react";

interface WrapperProps {
  children: React.ReactNode;
  previewText: string;
}

const baseUrl = "https://iaestelleida.cat";

export const EmailWrapper = ({ children, previewText }: WrapperProps) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{previewText}</Preview>
          <Container className="mx-auto my-[30px] max-w-[465px] rounded-xl border border-solid border-[#eaeaea] p-[20px]">
            <Section>
              <Img src={`${baseUrl}/logos/icon-lleida-blue.png`} height={80} />
            </Section>
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

EmailWrapper.PreviewProps = {
  children: (
    <>
      <Text>This is the default wrapper</Text>
    </>
  ),
} as WrapperProps;

export default EmailWrapper;
