# Tall Order (clothesapp)

Static web app, no build step. It is published as a Claude artifact: https://claude.ai/artifact/XJsY27rvh1JaptSgGW3gjr

## Who it's for

One person:
- tall, wears XL and up,
- lives in Thailand, mostly lounges at home in heat,
- avoids polyester and wants natural or organic fabrics,
- orders from Thailand, the USA or China.

## Rules

- Never show or recommend polyester, nylon, acrylic, rayon/viscose, modal or "bamboo".
  - Lyocell and up to 5% elastane are opt-in only (Fit tab).
- Idea cards are garment archetypes, not products. Never invent products, prices or stock.
  - Real products come only from `listings.json`.
- The user wants scientific and factual claims cited and double-checked.
  - Add any new claim to `RESEARCH_NOTES.md` with its source.
  - Mark it confirmed, snippet-only or unverified.
- Store photos in `listings/` are git-ignored. Never commit them.

## Layout

- `index.html` is artifact format: no doctype/html/head/body.
- `styles.css`, `catalog.js` and `app.js` are separate files, published next to it.
- `listings.json` plus `listings/*.jpg` come from `python3 -I tools/fetch_listings.py`.
- Preview locally with `python3 tools/serve.py`.

## Republishing the artifact

The Artifact tool only reads files under the session's working directory or scratchpad.
- First copy `index.html`, `styles.css`, `catalog.js`, `app.js`, `listings.json` and `listings/` into the scratchpad.
- Then publish that copy's `index.html` with `url` set to the artifact link above.

Pass `files` with these:
- `styles.css`, `catalog.js`, `app.js`, `listings.json`
- every `listings/*.jpg`

A publish holds at most 255 files.

Omit `capabilities` to keep the stored ones. They are:
- `db`, with rules `closets` read/write owner and `closets/{self}` read/write interact
- `user`
- `sample`
