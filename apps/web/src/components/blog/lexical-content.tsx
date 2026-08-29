import Image from "next/image";
import React from "react";

import type { LexicalState } from "@repo/constants/validators/blog";

import { env } from "@repo/env/web/server";

/**
 * Server-rendered reader for Payload Lexical article bodies. It walks the
 * serialized editor state directly and maps exactly the restricted node set
 * the CMS allows (paragraphs, h2–h4, bold/italic, lists, links, blockquotes,
 * uploads, rules) onto semantic HTML inside the existing `blog-prose` class.
 * Never uses `dangerouslySetInnerHTML`. Unknown nodes are skipped rather than
 * rendered raw.
 */

type LexicalNode = {
  type: string;
  version?: number;
  children?: LexicalNode[];
  direction?: "ltr" | "rtl" | null;
  // text
  text?: string;
  format?: number | string;
  // heading
  tag?: string;
  // list
  listType?: "bullet" | "number" | "check";
  // link
  fields?: {
    url?: string;
    newTab?: boolean;
    linkType?: "custom" | "internal";
  };
  // upload
  relationTo?: string;
  value?:
    | string
    | {
        url?: string | null;
        alt?: string | null;
        width?: number | null;
        height?: number | null;
        sizes?: {
          card?: {
            url?: string | null;
            width?: number | null;
            height?: number | null;
          } | null;
          hero?: {
            url?: string | null;
            width?: number | null;
            height?: number | null;
          } | null;
        } | null;
      };
};

const IS_BOLD = 1;
const IS_ITALIC = 1 << 1;

const UNSAFE_HREF = /^\s*(javascript:|vbscript:|data:(?!image\/))/i;

function absoluteMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url, env.CMS_PUBLIC_ORIGIN).toString();
  } catch {
    return null;
  }
}

function renderText(node: LexicalNode, key: React.Key) {
  const format = typeof node.format === "number" ? node.format : 0;
  let element: React.ReactNode = node.text ?? "";
  if (format & IS_BOLD) element = <strong>{element}</strong>;
  if (format & IS_ITALIC) element = <em>{element}</em>;
  return <React.Fragment key={key}>{element}</React.Fragment>;
}

function renderChildren(children: LexicalNode[] | undefined): React.ReactNode {
  if (!children?.length) return null;
  return children.map((child, index) => renderNode(child, index));
}

function renderUpload(node: LexicalNode, key: React.Key) {
  if (
    node.relationTo !== "media" ||
    !node.value ||
    typeof node.value !== "object"
  ) {
    return null;
  }
  const media = node.value;
  const source = media.sizes?.hero ?? media;
  const src = absoluteMediaUrl(source.url);
  if (!src) return null;

  return (
    <figure key={key} className="my-8">
      <Image
        src={src}
        alt={media.alt ?? ""}
        width={source.width ?? 1600}
        height={source.height ?? 900}
        sizes="(min-width: 768px) 768px, 100vw"
        className="w-full rounded-xl"
      />
    </figure>
  );
}

function renderNode(node: LexicalNode, key: React.Key): React.ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "linebreak":
      return <br key={key} />;
    case "paragraph": {
      const children = renderChildren(node.children);
      if (!children) return null;
      return <p key={key}>{children}</p>;
    }
    case "heading": {
      const tag = node.tag === "h3" || node.tag === "h4" ? node.tag : "h2";
      return React.createElement(tag, { key }, renderChildren(node.children));
    }
    case "quote":
      return <blockquote key={key}>{renderChildren(node.children)}</blockquote>;
    case "list": {
      const Tag = node.listType === "number" ? "ol" : "ul";
      return <Tag key={key}>{renderChildren(node.children)}</Tag>;
    }
    case "listitem":
      return <li key={key}>{renderChildren(node.children)}</li>;
    case "horizontalrule":
      return <hr key={key} />;
    case "link":
    case "autolink": {
      const href = node.fields?.url ?? "";
      if (UNSAFE_HREF.test(href)) return renderChildren(node.children);
      const newTab = node.fields?.newTab;
      return (
        <a
          key={key}
          href={href}
          {...(newTab
            ? { target: "_blank", rel: "noopener noreferrer nofollow" }
            : {})}
        >
          {renderChildren(node.children)}
        </a>
      );
    }
    case "upload":
      return renderUpload(node, key);
    default:
      return renderChildren(node.children);
  }
}

export function LexicalContent({ data }: { data: LexicalState }) {
  const root = (data as { root?: LexicalNode }).root;
  const children = Array.isArray(root?.children) ? root.children : [];
  return <div className="blog-prose">{renderChildren(children)}</div>;
}
