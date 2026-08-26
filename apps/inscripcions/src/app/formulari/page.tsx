import UserForm from "@/components/form";
import { env } from "@repo/env/inscripcions";
import { notFound } from "next/navigation";
import React from "react";

const FormPage = () => {
  if (env.NEXT_PUBLIC_INSCRIPCIONS_STATE !== "on") return notFound();

  return <UserForm />;
};

export default FormPage;
