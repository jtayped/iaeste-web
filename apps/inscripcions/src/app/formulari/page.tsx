import UserForm from "@/components/form";
import { notFound } from "next/navigation";
import React from "react";

const INSCRIPCIONS_STATE = process.env.INSCRIPCIONS_STATE as "on" | "off";

const FormPage = () => {
  if (INSCRIPCIONS_STATE != "on") return notFound();

  return <UserForm />;
};

export default FormPage;
