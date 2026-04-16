import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phaze Content Engine — AI-Powered Content Pipeline",
  description:
    "4-agent automated pipeline that scrapes viral data, validates it, and generates production-ready scripts and hooks tailored to your unique voice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
