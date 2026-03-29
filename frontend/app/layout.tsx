import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-google-sans',
});

export const metadata: Metadata = {
  title: "Enrollix - Admission CRM",
  description: "Modern Admission Management CRM - Enrollix Platform",
  icons: {
    icon: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/favicon.ico",
        href: "/favicon.ico",
      },
    ],
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable)}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
