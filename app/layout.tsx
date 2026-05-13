import type { Metadata } from "next";
import { AppwritePing } from "@/components/appwrite-ping";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bloom",
  description: "Certificate personalization and email sending MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppwritePing />
          {children}
        </Providers>
      </body>
    </html>
  );
}
