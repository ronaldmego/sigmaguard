import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PEPA Wallet Intelligence",
  description: "AI-governed wallet with 4-layer transaction governance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAFAF5] text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
