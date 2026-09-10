import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Violet Interview",
  description: "Evidence-backed AI voice interviews",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
