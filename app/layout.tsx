import type React from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/app/theme-provider";
import { ZoomPrevention } from "@/components/app/anti-zoom";
import { ServiceWorkerProvider } from "@/components/app/service-worker-provider";
import { brand } from "@/lib/brand";

const bricolage = localFont({
  src: "./fonts/bricolage-grotesque-latin.woff2",
  variable: "--font-bricolage",
  display: "swap",
  weight: "200 800",
  fallback: ["Arial", "sans-serif"],
});

export const metadata: Metadata = {
  applicationName: "Wajib",
  metadataBase: new URL("https://wajib.ahmadsul.com"),
  title: "Wajib — Make room for what matters",
  description: brand.description,
  openGraph: {
    title: "Wajib — واجب",
    description: brand.description,
    images: [
      {
        url: "/logos/social-card.png",
        width: 1200,
        height: 630,
        alt: "Wajib — واجب",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/logos/social-card.png"] },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Wajib",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/logos/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/logos/favicon-32x32.png",
        type: "image/png",
        sizes: "32x32",
      },
    ],
    apple: [
      {
        url: "/logos/apple-touch-icon.png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brand.colors.limestone },
    { media: "(prefers-color-scheme: dark)", color: brand.colors.forest },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={bricolage.variable}>
        <ZoomPrevention />
        <ServiceWorkerProvider />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="app-surface">
            <Suspense fallback={<div className="min-h-screen" />}>
              {children}
            </Suspense>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
