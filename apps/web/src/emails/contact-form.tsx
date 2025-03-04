import * as React from "react";

interface ContactFormEmailProps {
  name: string;
  email: string;
  message: string;
}

export const ContactFormEmail: React.FC<Readonly<ContactFormEmailProps>> = ({
  name,
  email,
  message,
}): React.ReactNode => (
  <div>
    <p>Missatge de {name}</p>
    <p>Email: {email}</p>
    <p>{message}</p>
  </div>
);
