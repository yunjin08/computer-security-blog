import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CMSC 124 Blog",
  description: "Project blog — weekly posts from Markdown",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
