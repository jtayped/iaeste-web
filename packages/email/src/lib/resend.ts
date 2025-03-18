import React from "react";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  to: string,
  subject: string,
  react: React.ReactNode
): Promise<void> {
  await resend.emails.send({
    // TODO: change "from" and "to" when the domain is configured
    // from: "noreply@iaestelleida.cat" ,
    // to,
    from: "onboarding@resend.dev",
    to: "iaeste.lleida@gmail.com",
    subject,
    react,
  });
}
