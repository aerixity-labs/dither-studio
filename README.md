# Dither Studio

Upload a photo, dither it in real time, and download the result. Everything runs
in the browser – no image ever leaves the machine.

## Getting started

```bash
pnpm install
pnpm dev
```

## Environment

`cp .env.example .env.local` is optional – a fresh clone runs fine on the
localhost default.

| Variable                        | Required | Notes                                                                                          |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | No       | Origin for `metadataBase`, canonical URLs, `robots.txt`, the sitemap and `llms.txt`.           |
| `VERCEL_ENV`                    | CI       | Gates the `noindex` rules. The production build sets it to `production`. Never set it by hand. |
| `VERCEL_PROJECT_PRODUCTION_URL` | No       | Legacy fallback when `NEXT_PUBLIC_SITE_URL` is unset.                                          |

Precedence is `NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` →
`http://localhost:3000`. The production build sets `NEXT_PUBLIC_SITE_URL`, so the
canonical host cannot change when domains are reassigned.

Both are read at build time: the site is a static export (`output: 'export'`),
and `pnpm build` writes it to `out/`.

## SEO

Every SEO fact has exactly one definition site, so nothing can drift:

| File                                                                | Owns                                                                                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/constants/site.ts`                                             | Name, title, description, keywords, theme colour, feature list, `SITE_LAST_MODIFIED`. Plain literals, safe to import anywhere. |
| `src/lib/seo/metadata.ts`                                           | The `Metadata` object and `viewport`. Server-only.                                                                             |
| `src/lib/seo/structured-data.ts`                                    | The `WebApplication` JSON-LD, rendered from `page.tsx`. Server-only.                                                           |
| `src/app/opengraph-image.png` + `.alt.txt`                          | The 1200×630 share card, picked up by Next's file convention.                                                                  |
| `src/app/{robots,sitemap,manifest}.ts`, `src/app/llms.txt/route.ts` | Generated routes.                                                                                                              |

Two things worth knowing before editing:

- **`openGraph.images` and every `twitter.*` field beyond `card` stay unset on
  purpose.** Next inherits the Twitter tags from `openGraph`, and declaring an
  `images` key stops the `opengraph-image` file convention from merging in.
- **Bump `SITE_LAST_MODIFIED` when the page's copy or features change**, not on
  every deploy – a sitemap that claims a change every deploy trains crawlers to
  ignore the field.

AI crawlers are deliberately allowed: being cited is the growth channel, and
`User-agent: *` already covers every named bot. Do not add per-bot groups – a
named group _replaces_ the `*` group for that agent rather than merging with it.

## Scripts

| Script              | What it does                            |
| ------------------- | --------------------------------------- |
| `pnpm dev`          | Dev server                              |
| `pnpm build`        | Static export to `out/`                 |
| `pnpm start`        | Serve `out/` locally (after a build)    |
| `pnpm lint`         | `oxlint`, warnings are errors           |
| `pnpm format`       | `oxfmt` in place                        |
| `pnpm format:check` | `oxfmt --check`                         |
| `pnpm typecheck`    | `tsc --noEmit`                          |
| `pnpm test`         | `vitest run` – dither core invariants   |
| `pnpm check`        | format check, lint, typecheck and tests |

`pnpm check` does not resolve CSS imports or the worker URL, so run `pnpm build`
before trusting a change to either.

## How it works

`src/lib/dither/core.ts` is the only place pixels are touched. The
preview, the main-thread fallback and all three export paths call it, so there is
one implementation to reason about and no chance of a download disagreeing with
what is on screen.

Two families of pattern:

- **Ordered / stochastic** – Bayer 2×2/4×4/8×8, halftone, crosshatch and noise
  compare each cell against a threshold function of its position and the current
  time. One pass, no inter-cell dependency, and therefore animatable.
- **Error diffusion** – Floyd–Steinberg and Atkinson push each cell's rounding
  error into cells not yet visited. Highest detail, inherently sequential, and
  not animatable, because a frame cannot be recomputed from a timestamp alone.
  The motion controls disable themselves and explain why.

Rendering happens in a Web Worker. The decoded source is uploaded once and kept
there, so an animated frame costs one buffer hand-off rather than two, and the
main thread only ever calls `putImageData`. A `requestAnimationFrame` loop paces
the frames and skips its turn while one is still in flight, so a slow device
drops to a lower frame rate instead of building an unbounded queue.

Previews are capped at 1400 px on the longest edge. **Downloads are not** –
`exportStill` re-dithers at the image's native resolution, so a 4000 px upload
downloads at 4000 px.

## Export formats

| Format        | Resolution                     |
| ------------- | ------------------------------ |
| PNG/JPEG/WebP | Full source resolution         |
| WebM (or MP4) | <= 1080 px, 4 s at 30 fps      |
| GIF           | <= 800 px, 24 frames at 20 fps |

Video uses `MediaRecorder` over a canvas capture stream, falling back to MP4
where WebM cannot be muxed (Safari). GIF uses `gifenc` with a single global
palette; in every mode but `original` the output colours are already known, so
the palette comes straight from the settings and the encode is lossless.

The animated formats are capped because both store whole frames – a
full-resolution GIF would run to hundreds of megabytes.

## Conventions

Style is enforced by `oxlint` and `oxfmt` (no semicolons, single quotes, trailing
commas). A few lint rules are switched off in `.oxlintrc.json` with the reasoning
recorded inline – most notably
`unicorn/require-post-message-target-origin`, which misfires on
`Worker.postMessage` and would break the worker if its advice were followed.

### shadcn/ui components

`components.json` is kept so `pnpm dlx shadcn@latest add <name>` still works – there
is no local `shadcn` dependency. The data-attribute variants those components style
against (`data-open`, `data-checked`, `data-active`, …) are **vendored into
`src/app/globals.css`** rather than imported from the CLI package.

**Six primitives are hand-modified. `shadcn add` would silently overwrite them:**

| File              | Change                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/slider.tsx`   | Forwards `aria-label`/`aria-labelledby`/`aria-valuetext` from Root to Thumb. Reverting leaves all sliders without an accessible name. |
| `ui/spinner.tsx`  | Props derived from `HugeiconsIcon`, not `svg`. Reverting is a **compile error**.                                                      |
| `ui/switch.tsx`   | Track colours pinned for the always-dark theme; whole-pixel thumb travel.                                                             |
| `ui/button.tsx`   | `destructive` is outlined rather than filled.                                                                                         |
| `ui/progress.tsx` | Taller track, so the bar reads as a gauge.                                                                                            |
| `ui/sonner.tsx`   | Per-status colour vars coupled to `globals.css`.                                                                                      |

Re-add any of these only if you are prepared to reapply the change.
