import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

import { brand } from "../lib/brand";
import {
  ARABIC_LETTERING_PATH,
  ARABIC_WAW_TRANSFORM,
  ARABIC_VIEW_BOX,
  LATIN_PATH,
  LATIN_VIEW_BOX,
  WAW_PATH,
  WAW_VIEW_BOX,
} from "../lib/brand-paths";

const output = new URL("../public/logos/", import.meta.url);
await mkdir(output, { recursive: true });

const svg = (viewBox: string, body: string, label = "Wajib") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill-rule="evenodd" role="img" aria-label="${label}">${body}</svg>\n`;
const shape = (path: string, color: string) =>
  `<path fill="${color}" d="${path}"/>`;
const arabicArtwork = (color: string) =>
  `${shape(ARABIC_LETTERING_PATH, color)}<g transform="${ARABIC_WAW_TRANSFORM}">${shape(WAW_PATH, color)}</g>`;
const save = (name: string, content: string | Buffer) =>
  writeFile(new URL(name, output), content);
const raster = async (name: string, source: string, size: number) =>
  save(
    name,
    await sharp(Buffer.from(source)).resize(size, size).png().toBuffer(),
  );

for (const [name, color] of Object.entries({
  olive: brand.colors.olive,
  cream: brand.colors.limestone,
  black: "#000000",
})) {
  await save(`mark-${name}.svg`, svg(WAW_VIEW_BOX, shape(WAW_PATH, color)));
  await save(
    `wordmark-arabic-${name}.svg`,
    svg(ARABIC_VIEW_BOX, arabicArtwork(color), "واجب"),
  );
  await save(
    `wordmark-latin-${name}.svg`,
    svg(LATIN_VIEW_BOX, shape(LATIN_PATH, color)),
  );
  await save(
    `lockup-${name}.svg`,
    svg(
      "0 0 805 495",
      `${arabicArtwork(color)}<g transform="translate(218 387)">${shape(LATIN_PATH, color)}</g>`,
      "Wajib — واجب",
    ),
  );
}

// The complete mark fits inside the central 80% maskable safe circle.
// Maskable icons have full-bleed opaque backgrounds; the OS supplies its mask.
const icon = (background: string, foreground: string, radius = 0) =>
  svg(
    "0 0 512 512",
    `<rect width="512" height="512" rx="${radius}" fill="${background}"/><svg x="127" y="91" width="258" height="330" viewBox="${WAW_VIEW_BOX}">${shape(WAW_PATH, foreground)}</svg>`,
  );
const primaryIcon = icon(brand.colors.olive, brand.colors.limestone);
const creamIcon = icon(brand.colors.limestone, brand.colors.olive);
await save("logo.svg", primaryIcon);
await save(
  "logo-white.svg",
  svg(WAW_VIEW_BOX, shape(WAW_PATH, brand.colors.limestone)),
);
await save("app-icon-olive.svg", primaryIcon);
await save("app-icon-cream.svg", creamIcon);
await save(
  "app-icon-clay.svg",
  icon(brand.colors.clay, brand.colors.limestone),
);
await save(
  "favicon.svg",
  icon(brand.colors.olive, brand.colors.limestone, 112),
);
await raster("logo.png", primaryIcon, 512);
await raster("logo-white.png", creamIcon, 512);
await raster("android-chrome-192x192.png", primaryIcon, 192);
await raster("android-chrome-512x512.png", primaryIcon, 512);
await raster("apple-touch-icon.png", primaryIcon, 180);
await raster(
  "favicon-32x32.png",
  icon(brand.colors.olive, brand.colors.limestone, 112),
  32,
);
await raster(
  "favicon-16x16.png",
  icon(brand.colors.olive, brand.colors.limestone, 112),
  16,
);

// All letterforms in the share card are paths; no fonts or raster logo embeds.
const social = svg(
  "0 0 1200 630",
  `<rect width="1200" height="630" fill="${brand.colors.limestone}"/><g transform="translate(330 104) scale(.67)">${arabicArtwork(brand.colors.olive)}<g transform="translate(218 387)">${shape(LATIN_PATH, brand.colors.olive)}</g></g><path d="M470 515h260" stroke="${brand.colors.clay}" stroke-width="3"/>`,
);
await save("social-card.svg", social);
await save(
  "social-card.png",
  await sharp(Buffer.from(social)).resize(1200, 630).png().toBuffer(),
);
console.log(
  "Generated the Soft Check SVG, PNG, favicon, install and social assets.",
);
