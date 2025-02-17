import { Button } from "@/components/ui/button";
import DivideSection from "@/components/common/sections/divide";
import { H2, Paragraph, Subheader } from "@/components/ui/typography";
import React from "react";

const WhyIaeste = () => {
  return (
    <DivideSection>
      <article>
        <H2>Why IAESTE?</H2>
        <Subheader>Lorem ipsum dolor sit amet</Subheader>
        <Paragraph>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Esse sequi
          optio aperiam fugiat maiores unde rerum nulla blanditiis numquam odio!
        </Paragraph>
        <Button className="mt-3">Button 1</Button>
      </article>
      <div></div>
    </DivideSection>
  );
};

export default WhyIaeste;
