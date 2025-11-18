import UserForm from "@/components/form";
import { INSCRIPCIONS_STATE } from "@repo/constants/inscripcions";
import { notFound } from "next/navigation";
import React from "react";

const FormPage = () => {
  if (INSCRIPCIONS_STATE != "on") return notFound();

  return <UserForm />;
};

export default FormPage;
