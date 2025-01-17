import { Button } from "@/components/ui/button";
import React from "react";
import Outgoings from "./outgoings";

const WhyIaeste = () => {
  return (
    <div className="grid grid-cols-2 px-screen">
      <div>
        <h2 className="text-3xl font-semibold">Why IAESTE?</h2>
        <p className="text-muted-foreground mt-1">Lorem ipsum dolor sit amet</p>
        <p className="text-lg mt-3">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Esse sequi
          optio aperiam fugiat maiores unde rerum nulla blanditiis numquam odio!
        </p>
        <Button className="mt-3">Button 1</Button>
      </div>
      <div className="flex justify-center items-center">
        <Outgoings />
      </div>
    </div>
  );
};

export default WhyIaeste;
