import React from "react";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  to: string,
  subject: string,
  react: React.ReactNode
): Promise<void> {
  await resend.emails.send({
    from: "noreply@iaestelleida.cat",
    to,
    subject,
    react,
  });
}
