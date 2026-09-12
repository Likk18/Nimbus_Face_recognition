import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nimbus Biometric Intelligence | Face Recognition HUD",
  description: "Enterprise Dual-Verification Face Recognition & Identification System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-slate-100 font-sans antialiased biometric-grid">
        {children}
      </body>
    </html>
  );
}
