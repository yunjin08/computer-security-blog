"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import type { ComponentProps } from "react";

type CodeBlockProps = ComponentProps<"code">;

export function CodeBlock({ className, children, ...props }: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className ?? "");
  const raw = children ?? "";
  const code = Array.isArray(raw) ? raw.join("") : String(raw);
  const value = code.replace(/\n$/, "");

  if (match) {
    let lang = match[1];
    if (lang === "asm") lang = "nasm";
    return (
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        PreTag="div"
        customStyle={{
          margin: "1rem 0",
          borderRadius: "8px",
          fontSize: "0.875rem",
          lineHeight: 1.5,
        }}
        codeTagProps={{ style: { fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace" } }}
        showLineNumbers={false}
      >
        {value}
      </SyntaxHighlighter>
    );
  }

  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}
