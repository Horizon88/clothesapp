# Tall Order

A swipe-to-shop stylist for tall, extra-large bodies who want natural fabrics and live in a hot climate. It's built for someone in Thailand who orders from Thailand, the USA or China.

Swipe right to like, up to love, left to pass. The app learns your taste from every swipe and puts what you'll probably like next at the front.

## What's in it

- **In stock now:** real clothes, all natural fibre, in stock in XL and up, from stores that ship to Thailand (American Tall, MagicLinen, notPERFECTLINEN).
  - Each card shows the photo, price, exact fabric and the sizes in stock for you.
  - Polyester, nylon, acrylic, rayon, viscose, modal and "bamboo" are filtered out.
- **Ideas:** about 100 garment ideas (linen camp shirts, gauze sleep sets, Thai fisherman pants and so on). Each one comes with ready-made searches for Shopee, Lazada, Taobao, US tall stores and Etsy, in English, Thai and Chinese.
- **Fit:** measure clothes that already fit you. The app turns those numbers into:
  - a tall check on every card,
  - Taobao's height-and-weight charts (weight in jin, 斤),
  - the inch charts Thai sellers use,
  - US tall height bands.
- **Closet:** everything you liked, with links to the store and a shopping list you can copy.
- **Stylist:** a Claude chat that knows your measurements and swipes, and can put items at the top of your deck. It works inside Claude only; elsewhere you get a brief to paste into any Claude chat.

## Live version

The app runs as a private Claude artifact: https://claude.ai/artifact/XJsY27rvh1JaptSgGW3gjr

Inside Claude it syncs your swipes to your Claude account and the live stylist works. Only the owner can open the link unless it's shared from its Share menu.

## Run it locally

```sh
python3 -I tools/fetch_listings.py   # first time: pulls listings and product photos
python3 tools/serve.py               # then open http://localhost:8000
```

Locally, swipes are saved in your browser only.

## Refresh stock and prices

```sh
python3 -I tools/fetch_listings.py
```

The script reads each store's public product feed and keeps only natural-fibre clothing in stock in XL and up. It writes `listings.json` and saves thumbnails to `listings/`.

The thumbnails are the stores' own photos. They are git-ignored and only published to the private artifact.

## Files

| File | What it is |
|---|---|
| `index.html` | Page markup, written in Claude Artifact format (no `<html>`/`<head>`; `tools/serve.py` adds them locally) |
| `styles.css` | All styling, light and dark themes |
| `catalog.js` | Idea cards, fabrics, colours, store search links, scientific references |
| `app.js` | Swipe deck, taste learning, fit tools, closet, stylist |
| `listings.json` | Snapshot of real in-stock listings |
| `tools/fetch_listings.py` | Rebuilds `listings.json` and thumbnails |
| `tools/serve.py` | Local preview server |
| `RESEARCH_NOTES.md` | Sources for every store, sizing fact and fabric claim, with what could and couldn't be confirmed |

## Sources

Claims shown in the app are cited in `RESEARCH_NOTES.md`. They include:
- polyester vs. cotton odour (Callewaert et al. 2014),
- microfibre shedding (Napper & Thompson 2016; De Falco et al. 2019),
- the FTC's 2022 "bamboo" penalties,
- GOTS labelling rules,
- Thailand's January 2026 import duty change.
