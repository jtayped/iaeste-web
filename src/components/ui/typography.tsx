import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>;

export const H1: React.FC<Props> = ({ children, className = "", ...props }) => (
  <h1
    className={`scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl ${className}`}
    {...props}
  >
    {children}
  </h1>
);

export const H2: React.FC<Props> = ({ children, className = "", ...props }) => (
  <h2
    className={`mt-10 scroll-m-20 text-3xl font-semibold tracking-tight transition-colors first:mt-0 ${className}`}
    {...props}
  >
    {children}
  </h2>
);

export const H3: React.FC<Props> = ({ children, className = "", ...props }) => (
  <h3
    className={`mt-8 scroll-m-20 text-2xl font-semibold tracking-tight ${className}`}
    {...props}
  >
    {children}
  </h3>
);

export const Subheader: React.FC<Props> = ({
  children,
  className = "",
  ...props
}) => (
  <p
    className={`mt-2 scroll-m-20 text-lg text-muted-foreground tracking-tight ${className}`}
    {...props}
  >
    {children}
  </p>
);

export const Paragraph: React.FC<Props> = ({
  children,
  className = "",
  ...props
}) => (
  <p className={`leading-7 [&:not(:first-child)]:mt-6 ${className}`} {...props}>
    {children}
  </p>
);

export const Blockquote: React.FC<Props> = ({
  children,
  className = "",
  ...props
}) => (
  <blockquote
    className={cn("mt-6 border-l-2 border-primary pl-6 italic", className)}
    {...props}
  >
    {children}
  </blockquote>
);

export const UnorderedList: React.FC<Props> = ({
  children,
  className = "",
  ...props
}) => (
  <ul className={`my-6 ml-6 list-disc [&>li]:mt-2 ${className}`} {...props}>
    {children}
  </ul>
);

export const Link: React.FC<
  Props & React.AnchorHTMLAttributes<HTMLAnchorElement>
> = ({ children, className = "", ...props }) => (
  <a
    className={`font-medium text-primary underline underline-offset-4 ${className}`}
    {...props}
  >
    {children}
  </a>
);

export const Table: React.FC<Props> = ({
  children,
  className = "",
  ...props
}) => (
  <div className="my-6 w-full overflow-y-auto">
    <table className={`w-full ${className}`} {...props}>
      {children}
    </table>
  </div>
);

export const Th: React.FC<
  Props & React.ThHTMLAttributes<HTMLTableCellElement>
> = ({ children, className = "", ...props }) => (
  <th
    className={`border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right ${className}`}
    {...props}
  >
    {children}
  </th>
);

export const Td: React.FC<
  Props & React.TdHTMLAttributes<HTMLTableCellElement>
> = ({ children, className = "", ...props }) => (
  <td
    className={`border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right ${className}`}
    {...props}
  >
    {children}
  </td>
);

export const Tr: React.FC<
  Props & React.HTMLAttributes<HTMLTableRowElement>
> = ({ children, className = "", ...props }) => (
  <tr className={`m-0 border-t p-0 even:bg-muted ${className}`} {...props}>
    {children}
  </tr>
);
