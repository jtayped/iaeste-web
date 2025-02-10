import { Button } from "@/components/ui/button";
import React from "react";
import Outgoings from "./outgoings";
import DivideSection from "@/components/common/sections/divide";
import { H2, Paragraph, Subheader } from "@/components/ui/typography";

const WhyIaeste = () => {
  return (
    <DivideSection>
      <article>
        <H2>Why IAESTE?</H2>
        <Subheader>Lorem ipsum dolor sit amet</Subheader>
        <Paragraph >
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Esse sequi
          optio aperiam fugiat maiores unde rerum nulla blanditiis numquam odio!
        </Paragraph>
        <Button className="mt-3">Button 1</Button>
      </article>
      <div className="flex justify-center items-center">
        <Outgoings />
      </div>
    </DivideSection>
  );
};

export default WhyIaeste;
