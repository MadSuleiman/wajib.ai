import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/app/theme-provider";
import { ZoomPrevention } from "@/components/app/anti-zoom";
import Grainient from "@/components/Grainient";

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
  initialScale: 0.9,
  maximumScale: 0.9,
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
          <div className="grainient-surface">
            <Grainient
              className="grainient-layer"
              color1="var(--grainient-color-1)"
              color2="var(--grainient-color-2)"
              color3="var(--grainient-color-3)"
              timeSpeed={0.16}
              colorBalance={-0.03}
              warpStrength={0.7}
              warpFrequency={3.4}
              warpSpeed={1.1}
              warpAmplitude={95}
              blendAngle={-12}
              blendSoftness={0.12}
              rotationAmount={240}
              noiseScale={1.4}
              grainAmount={0.02}
              grainScale={1.8}
              grainAnimated={false}
              contrast={1.08}
              gamma={1}
              saturation={0.86}
              centerX={0}
              centerY={0}
              zoom={1}
            />
            <div className="grainient-content">
              <Suspense fallback={<div className="min-h-screen"></div>}>
                {children}
              </Suspense>
            </div>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
