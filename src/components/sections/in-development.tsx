import { Link } from "@/i18n/routing";
import React from "react";
import { BiCode } from "react-icons/bi";
import { Button } from "../ui/button";
import BackButton from "../ui/back-btn";

const InDevelopment = () => {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-primary/50">
      <div className="flex flex-col items-center text-center max-w-screen-sm px-screen">
        <span className="p-4 bg-primary/30">
          <BiCode size={40} />
        </span>
        <p className="text-3xl font-semibold mt-5">
          This page is under construction!
        </p>
        <p className="mt-2">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Nam, cum!
        </p>
        <div className="flex items-center gap-2 mt-4">
          <Button asChild>
            <Link href={"/"}>Home</Link>
          </Button>
          <BackButton variant="secondary">Go back</BackButton>
        </div>
      </div>
    </div>
  );
};

export default InDevelopment;
