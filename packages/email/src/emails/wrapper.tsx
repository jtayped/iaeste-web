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
        <Body className="bg-white my-auto mx-auto font-sans px-2">
          <Preview>{previewText}</Preview>
          <Container className="border border-solid border-[#eaeaea] rounded-xl my-[30px] mx-auto p-[20px] max-w-[465px]">
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
