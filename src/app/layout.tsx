import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Quiz Master - Smart Adaptive Learning",
  description: "AI-powered online quiz application with adaptive difficulty, teacher panel and personalized learning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
