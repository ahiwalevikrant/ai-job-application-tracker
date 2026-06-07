import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Application Tracker | Vikrant",
  description: "Track job applications, import descriptions, and generate tailored cover letters and resume bullets.",
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

