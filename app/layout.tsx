import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wajib AI",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
