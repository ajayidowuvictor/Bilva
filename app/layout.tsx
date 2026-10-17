import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bilva",
  description:
    "Copywriting intelligence for businesses. Turn a rough idea into strategically developed, persuasive copy.",
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
