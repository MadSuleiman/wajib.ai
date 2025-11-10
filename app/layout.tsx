import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ZoomPrevention } from "@/components/anti-zoom";

const inter = Inter({ subsets: ["latin"], variable: "--font-arabicStyle" });

export const metadata: Metadata = {
  title: "wajib",
  description: "An app for assorting your tasks",
  icons: {
    icon: [
      {
        media: "(prefers-color-scheme: light)",
        url: "/logos/logo.png",
        href: "/logos/logo.png",
      },
      {
        media: "(prefers-color-scheme: dark)",
        url: "/logos/logo-white.png",
        href: "/logos/logo-white.png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 0.8,
  maximumScale: 0.8,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ZoomPrevention />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="ambient-surface">
            <Suspense fallback={<div className="min-h-screen"></div>}>
              {children}
            </Suspense>
          </div>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
