import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
});

export const metadata: Metadata = {
  title: "Guruverse - Admission CRM",
  description: "Modern Admission Management CRM - Guruverse Platform",
  icons: {
    icon: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/favicon.svg",
        href: "/favicon.svg",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(plusJakartaSans.variable)}>
      <body className="font-sans [font-family:var(--font-plus-jakarta-sans)]">{children}</body>
    </html>
  );
}
