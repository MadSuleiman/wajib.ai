import { brand } from "@/lib/brand";

const manifest = {
  id: "/",
  name: "wajib",
  short_name: "Wajib",
  description: brand.description,
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: brand.colors.limestone,
  theme_color: brand.colors.limestone,
  icons: [
    {
      src: "/logos/logo.svg",
      sizes: "any",
      type: "image/svg+xml",
    },
    {
      src: "/logos/android-chrome-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/logos/android-chrome-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/logos/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  ],
};

export function GET() {
  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}
