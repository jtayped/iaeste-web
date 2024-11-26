import Image from "next/image";
import React from "react";

const Footer = () => {
  return (
    <footer className="bg-primary p-8 flex items-center gap-10">
      <Image
        src={"/logos/horizontal.png"}
        width={300}
        height={200}
        alt="IAESTE Logo"
      />
      <div></div>
    </footer>
  );
};

export default Footer;
