import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bulletproof Sentinel AI",
  description: "Autonomous AI Cyber Defense Copilot",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-sentinel-bg text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
