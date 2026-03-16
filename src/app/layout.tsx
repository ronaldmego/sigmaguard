import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PEPA — Statistical DeFi Intelligence",
  description: "Autonomous DeFi agent with Six Sigma anomaly detection and 4-layer governance pipeline",
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
