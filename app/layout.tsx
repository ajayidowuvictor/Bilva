import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteFooter from "@/components/SiteFooter";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "Bilva",
  description:
    "Copywriting intelligence for businesses. Turn a rough idea into strategically developed, persuasive copy.",
  applicationName: "Bilva",
  appleWebApp: { capable: true, title: "Bilva", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#01002a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <SiteFooter />
        <RegisterSW />
      </body>
    </html>
  );
}
