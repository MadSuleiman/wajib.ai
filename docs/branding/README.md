# Wajib · Soft Check

Approved mark: **Soft Check**, an Arabic **و** with a rounded checkbox head and a checkmark tail. It appears both on its own and as the first letter of the bilingual **واجب / wajib** wordmark. The With Intent palette and typography continue: warm olive and limestone surfaces, and the same Bricolage Grotesque family as Ahmad's bilingual portfolio.

## Logo assets

All production artwork is vector outlines, with no embedded raster image or required font. The approved letterforms are preserved in [`lib/brand-paths.ts`](../../lib/brand-paths.ts). The standalone mark and Arabic wordmark use the same `WAW_PATH`; `ARABIC_WAW_TRANSFORM` positions it beside the remaining letters. The letter counters use the SVG `evenodd` fill rule; preserve it when importing the paths into another design tool.

Assets live in [`public/logos`](../../public/logos):

| Use                 | Asset                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| Primary app icon    | `app-icon-olive.svg`                                                               |
| Alternate app icons | `app-icon-cream.svg`, `app-icon-clay.svg`                                          |
| Standalone mark     | `mark-olive.svg`, `mark-cream.svg`, `mark-black.svg`                               |
| Arabic wordmark     | `wordmark-arabic-{olive,cream,black}.svg`                                          |
| Latin wordmark      | `wordmark-latin-{olive,cream,black}.svg`                                           |
| Bilingual lockup    | `lockup-{olive,cream,black}.svg`                                                   |
| Browser favicon     | `favicon.svg`, `favicon-16x16.png`, `favicon-32x32.png`                            |
| Install icons       | `android-chrome-192x192.png`, `android-chrome-512x512.png`, `apple-touch-icon.png` |
| Sharing             | `social-card.svg`, `social-card.png` (1200 × 630)                                  |

`logo.svg`, `logo.png`, `logo-white.svg`, and `logo-white.png` also carry the new identity so existing links continue to work.

Use cream on olive as the primary install icon. The install PNGs intentionally have square, opaque backgrounds: the operating system supplies the rounded or circular mask. The full mark fits inside the central maskable safe circle. Use the rounded `favicon.svg` for browser tabs.

Use **و + wajib** in application headers and the bilingual lockup on sign-in, offline, and larger brand surfaces. Do not stretch the logo, rotate it, change its dots, or fill its counters. Give the mark clear space of at least one-quarter of its width. Keep it at least 24 px tall in application headers; the supplied padded favicon is the small-size exception.

## Color and type

| Color     | Value     | Role                                        |
| --------- | --------- | ------------------------------------------- |
| Limestone | `#F4ECDD` | Light background; inverse mark              |
| Olive     | `#3E4C35` | Primary mark, light buttons and headings    |
| Clay      | `#C66A48` | Small decorative accents and alternate icon |
| Charcoal  | `#282A25` | Light body text                             |
| Forest    | `#20271F` | Dark background                             |
| Sage      | `#B3C39C` | Dark buttons, active states and mark        |

The palette is defined in `lib/brand.ts` for assets and metadata and in `app/globals.css` for UI tokens. Olive on limestone has a 7.81:1 contrast ratio; cream on forest is 13.04:1; sage on forest is 8.17:1. Clay is decorative, not small body text on limestone.

Bricolage Grotesque is bundled locally using `next/font/local`, so builds and page loads do not depend on Google Fonts. The Latin variable font is licensed under the SIL Open Font License in `app/fonts/OFL-BricolageGrotesque.txt`. The logo lettering itself is outlined artwork.

The olive branch is a secondary accent, used sparingly on sign-in and the daily highlight. Keep task surfaces quiet, with a solid background and restrained borders. Category colors remain the user's choices.

## Regenerate

```sh
bun run brand:generate
```

This produces SVGs and PNGs from the shared paths. PNG rendering uses the pinned development dependency `sharp`. Raster concept boards are not runtime dependencies. After replacing cached install assets, also bump the service worker cache version.

## Local preview and verification

For a preview containing only synthetic example data, run these in separate terminals:

```sh
bun tests/fixtures/supabase-preview.ts
```

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-brand-preview-only \
bun dev --hostname 127.0.0.1 --port 3109
```

Open `http://127.0.0.1:3109/auth` and sign in with `brand-preview@example.test` and `local-preview-only`. The fixture binds only to loopback, stores example data in memory, and is never imported by the application. It does not validate authentication or reproduce production Supabase security; use it only for local UI verification.

```sh
bun run check
bun test
E2E_BASE_URL=http://127.0.0.1:3109 \
E2E_USER_EMAIL=brand-preview@example.test \
E2E_USER_PASSWORD=local-preview-only \
bun run test:e2e
```

The mobile flow checks sign-in, task creation/completion, routine creation, tab navigation, settings, theme changes, browser theme color, and horizontal overflow. Screenshots in `previews/` use synthetic data.

If Playwright's bundled browser is not installed, run `bunx playwright install chromium`, or set `E2E_BROWSER_CHANNEL=chrome` to use an installed Google Chrome.

Final application previews: [sign-in](previews/sign-in-light.png), [desktop](previews/dashboard-desktop-light.png), [mobile light](previews/dashboard-mobile-light.png), and [mobile dark](previews/dashboard-mobile-dark.png).
