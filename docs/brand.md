# Brand

Last verified: 2026-09-26

The source is `refs/Bandicoot-Racing_Brand-Identity_NT_6.24.24.pdf` (Bandicoot Motorwerks, 32 pages). The team car is **#440**, a Miami Blue BMW E36.

## Name

The name is **SUCK IT, RANDY**: the manifest `short_name` is `SUCK IT RANDY`, and the header shows "Suck it, Randy" set in uppercase display type.

## Palette

The swatches come from page 4 of the PDF. The app maps them to `@theme` tokens in `app/src/styles.css`.

| Brand swatch | Hex | App token |
|---|---|---|
| Orange 01 | `#ff884d` | `accent` |
| Rust 01 | `#d46e3b` | `rust` |
| Rust 02 | `#b05126` | — |
| Miami Blue | `#1dbee8` | `mycar` (our car is Miami Blue) |
| Miami Blue Light | `#61d7f6` | `miami-light` |
| Gray (lightest) | `#f4f4f4` | `pit-text` |
| Gray 01 | `#e0e0e0` | — |
| Gray 02 | `#21272a` | `pit-panel` |
| Gray 03 | `#343a3f` | `pit-line` |
| Gray 04 | `#121619` | `pit-bg` |
| Black | `#000000` | — |

- `pit-dim` (`#a2a9b0`) isn't a brand swatch. It's a mid grey chosen so body text stays at AA contrast on `pit-bg` and `pit-panel`.
- Flag colours (green/yellow/red/white) are **not** re-branded; they have to read as flags.

## Type

The PDF exports its text as unnamed Type3 glyphs, so the font names can't be extracted. The faces were identified by eye and approximated with Google Fonts:

- **IBM Plex Sans** for UI text. The deck's captions are Plex, and it uses the IBM Quantum template.
- **IBM Plex Mono** for tabular timing numerals (`.tnum`).
- **Barlow Condensed** (600/800) for display type, as a stand-in for the condensed DIN-style "440" wordmark.

## Assets (`app/public/brand/`)

| File | What it is | How it was made |
|---|---|---|
| `bandicoot.png` | The logo head on a transparent background, 512 px wide | PDF page 6 rendered at 2×, grey panel flood-filled to transparent |
| `hero-800.webp`, `hero-1376.webp` | Splash art: the bandicoot, in a Miami Blue suit, stomping #760 (Randy's red Volvo 760) flat | Generated with Gemini from the logo + `refs/randys_car.jpg` as references. The source is `refs/suckitrandy.jpg` (1376×768). The splash feathers its edges with a CSS mask (`.hero-fade`) because its background (≈`#161b1e`) is a shade lighter than `pit-bg`. |
| `icon-192.png`, `icon-512.png` | PWA icons | Logo on a `#121619` rounded square |
| `../icon.svg` | Favicon | Same as the PWA icons, as SVG |

To regenerate these, use PyMuPDF and Pillow in a scratch venv. The Type3/clip-path vectors don't survive a raw path export, so rasterising is the reliable route.
