"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { brand } from "@/lib/brand";

function ThemeChrome() {
  const { resolvedTheme } = useTheme();
  React.useEffect(() => {
    if (!resolvedTheme) return;
    const color =
      resolvedTheme === "dark" ? brand.colors.forest : brand.colors.limestone;
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => {
        meta.content = color;
      });
  }, [resolvedTheme]);
  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeChrome />
      {children}
    </NextThemesProvider>
  );
}
