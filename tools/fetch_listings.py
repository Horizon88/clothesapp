#!/usr/bin/env python3
"""Pull real listings for Tall Order from stores' public Shopify product feeds.

Keeps only clothing that:
  * is natural fibre (cotton, linen, hemp, wool, silk), optionally with up to
    5% elastane or with lyocell (the app hides those unless the person allows
    them); anything listing polyester, nylon, acrylic, rayon, viscose, modal
    or bamboo is dropped,
  * is in stock in XL or bigger (or a big waist / women's 14+),
  * maps to one of the app's garment categories.

Writes tall-order/listings.json and product thumbnails to tall-order/listings/
(thumbnails are git-ignored: they are the stores' photos, published only to the
private artifact).

Usage:  python3 -I tall-order/tools/fetch_listings.py [--no-images]
"""

import html
import io
import json
import os
import re
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_JSON = os.path.join(ROOT, "listings.json")
IMG_DIR = os.path.join(ROOT, "listings")
UA = "TallOrder-personal-shopper/1.0 (one person's shopping list; low volume)"

STORES = [
    {"id": "at", "name": "American Tall", "domain": "americantall.com", "region": "US", "tall": True, "dept": None, "cap": 150,
     "ships": "Thailand is in the store's ship-to list."},
    {"id": "magic", "name": "MagicLinen", "domain": "magiclinen.com", "region": "Global", "tall": False, "dept": None, "cap": 25,
     "ships": "Ships worldwide by courier; Thailand is in the country list."},
    {"id": "npl", "name": "notPERFECTLINEN", "domain": "notperfectlinen.com", "region": "Global", "tall": False, "dept": None, "cap": 25,
     "ships": "Ships worldwide by post, DHL or FedEx; Thailand is in the country list.",
     # A linen-only maker whose feed rarely states percentages; its product pages
     # describe EUROPEAN FLAX and OEKO-TEX certified linen fabric.
     "assume": ("linen", "Linen (European Flax certified)")},
]

PER_STYLE_COLORS = 2
CAT_CAP = {"pants": 14, "tee": 24, "shirt": 14, "shorts": 12}

NATURAL = {"cotton": "cotton", "organic cotton": "cotton", "supima": "cotton", "pima": "cotton", "regenerative cotton": "cotton",
           "linen": "linen", "flax": "linen", "hemp": "hemp", "wool": "wool", "merino": "wool", "merino wool": "wool",
           "cashmere": "wool", "alpaca": "wool", "silk": "silk"}
SEMI = ("lyocell", "tencel")
STRETCH = ("spandex", "elastane", "lycra")
BANNED = ("polyester", "poly", "nylon", "polyamide", "acrylic", "polypropylene", "rayon", "viscose", "modal", "bamboo",
          "acetate", "triacetate", "microfiber", "microfibre", "pu", "polyurethane", "olefin", "metallic")

SKIP_TYPES = re.compile(r"footwear|accessor|tailored|swim|bodysuit|legging|skirt|gift|pillow|sheet|towel|apron|napkin|tablecloth|"
                        r"blanket|duvet|curtain|bag|bedding|home|kitchen|bath mat|runner|placemat|bra\b|intimates-w", re.I)
SKIP_TITLE = re.compile(r"\b(bra|bralette|legging|skirt|skort|swim|bikini|sock(?!s?\b)|hat|cap|beanie|belt|shoe|sneaker|boot|loafer|"
                        r"flat|sandal|flip|slipper|suit|blazer|tuxedo|vest|parka|puffer|raincoat|mask|scrunchie|scarf|glove|tie\b|"
                        r"gift card|pillow|towel|apron|napkin|bag|tote|bodysuit|thong|panty|panties)\b", re.I)

CAT_RULES = [
    (r"\brobe|kimono\b", "robe"),
    (r"\bshorts\b", "shorts"),
    (r"pajama|pyjama|sleep set|lounge set|\bset\b", "pajama"),
    (r"jumpsuit|overall|romper|boilersuit", "jumpsuit"),
    (r"shirtdress|\bdress\b(?!\s*(shirt|pant|trouser|sock))", "dress"),
    (r"hoodie|hooded", "hoodie"),
    (r"cardigan", "cardigan"),
    (r"sweater|pullover|jumper", "sweater"),
    (r"sweatshirt|crewneck sweat", "sweat"),
    (r"jogger", "joggers"),
    (r"sweatpant|lounge pant|sleep pant|pj pant|pajama pant", "pants"),
    (r"wide[- ]leg|palazzo|culotte", "widepants"),
    (r"\bpants?\b|trouser|chino|jean", "pants"),
    (r"boxer|brief|trunk", "boxers"),
    (r"\bsocks?\b", "socks"),
    (r"henley", "henley"),
    (r"\bpolo\b", "polo"),
    (r"\btank\b|\bcami|sleeveless", "tank"),
    (r"overshirt|shacket|shirt jacket|chore|jacket", "overshirt"),
    (r"t-shirt|\btee\b", "tee"),
    (r"camp|cuban|resort shirt", "camp"),
    (r"shirt|blouse|button", "shirt"),
    (r"long[- ]sleeve", "longtee"),
    (r"\btop\b|tunic", "tee"),
]

VIBE_BY_CAT = {
    "tee": ["minimal"], "tank": ["minimal"], "henley": ["minimal", "cozy"], "longtee": ["minimal"], "polo": ["smart"],
    "camp": ["resort"], "shirt": ["smart"], "overshirt": ["workwear"], "hoodie": ["cozy"], "sweat": ["cozy"],
    "sweater": ["cozy"], "cardigan": ["cozy"], "pants": ["minimal"], "widepants": ["resort"], "joggers": ["cozy"],
    "shorts": ["resort"], "pajama": ["sleep"], "robe": ["sleep"], "boxers": ["sleep"], "socks": ["minimal"],
    "dress": ["resort"], "jumpsuit": ["resort"],
}

# How much a category matters for someone who mostly lounges at home in heat.
LOUNGE = {"tee": 3, "tank": 3, "henley": 3, "longtee": 2, "joggers": 3, "shorts": 3, "pajama": 3, "robe": 3, "boxers": 2,
          "hoodie": 2, "sweat": 2, "camp": 2.5, "shirt": 1.5, "widepants": 2.5, "pants": 1.5, "polo": 1.5, "sweater": 1,
          "cardigan": 1.2, "overshirt": 1, "socks": 1, "dress": 2, "jumpsuit": 1.5}

COLOR_RULES = [
    (r"black|onyx|jet|ink\b", "ebony"), (r"charcoal|graphite|slate|smoke|dark gr[ae]y|asphalt|iron", "charcoal"),
    (r"navy|midnight", "navy"), (r"indigo|denim|dark wash|rinse|dark blue", "indigo"),
    (r"blue|sky|chambray|light wash|cornflower|ocean|teal|lavender|lilac|periwinkle", "sky"),
    (r"white|optic|snow", "bone"), (r"ivory|cream|ecru|natural|undyed|\bbone\b|vanilla|milk|eggshell|off-white|flax", "raw"),
    (r"\boat|oatmeal|beige|sand|khaki|\btan\b|camel|taupe|mushroom|latte|stone|almond|nude", "sand"),
    (r"grey|gray|heather|ash|silver|pebble", "heather"),
    (r"brown|espresso|chocolate|coffee|mocha|walnut|cocoa|chestnut|raisin|cognac", "brown"),
    (r"olive|army|fatigue|military", "olive"), (r"sage|mint|eucalyptus|pistachio|seagrass", "sage"),
    (r"green|forest|moss|hunter|pine|emerald|spruce|juniper", "moss"),
    (r"red|burgundy|wine|maroon|cranberry|cherry|plum|purple|berry|merlot", "lac"),
    (r"rust|terracotta|orange|copper|burnt|brick", "rust"), (r"clay|blush|pink|rose|coral|peach|salmon|dusty", "clay"),
    (r"yellow|mustard|gold|ochre|turmeric|butter", "turmeric"),
]

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"]


def fetch(url, binary=False, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=40) as r:
                data = r.read()
            return data if binary else data.decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def all_products(domain):
    out = []
    for page in range(1, 40):
        data = json.loads(fetch(f"https://{domain}/products.json?limit=250&page={page}"))
        prods = data.get("products", [])
        out += prods
        if len(prods) < 250:
            break
        time.sleep(1)
    return out


def text_of(body):
    t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", body or "", flags=re.S | re.I)
    t = re.sub(r"<br\s*/?>|</p>|</li>|</h\d>", "\n", t, flags=re.I)
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    return re.sub(r"[ \t\r\f\v]+", " ", t)


PCT = re.compile(r"(\d{1,3}(?:\.\d)?)\s*%\s*([A-Za-z][A-Za-z\- ]{1,28})")


def composition(text, store=None, title=""):
    """Return (kind, main_fibre, comp_string, organic) or None if unusable."""
    low = text.lower()
    if store and store.get("assume"):
        fib, label = store["assume"]
        if re.search(r"\b(polyester|nylon|acrylic|polyamide|rayon|viscose|modal|bamboo|cotton|wool|silk|hemp)\b", low + " " + title.lower()):
            pass  # mentions another fibre: fall through to normal parsing
        elif re.search(fib, low + " " + title.lower()):
            return "natural", fib, label, False
    pairs = []
    for pct, name in PCT.findall(text):
        name = name.strip().lower()
        name = re.split(r"\s+(?:and|with|for|from|that|which|in|to|is|blend|fabric|knit|jersey|twill|fleece|terry|construction|sourced|we)\b", name)[0].strip()
        pairs.append((float(pct), name))
    fibres = [n for _, n in pairs]

    def has(words, names):
        return any(any(re.search(r"\b" + re.escape(w) + r"\b", n) for w in words) for n in names)

    if has(BANNED, fibres):
        return None
    # Synthetic words mentioned without a percentage (e.g. "polyester pocketing"):
    # drop unless the text states a clean "100% <natural fibre>".
    clean100 = re.search(r"100\s*%\s*(organic\s+)?(cotton|linen|flax|hemp|wool|merino|silk|cashmere)", low)
    if not clean100 and re.search(r"\b(polyester|nylon|acrylic|polyamide|rayon|viscose|modal|bamboo)\b", low):
        return None
    if not pairs and not clean100:
        return None

    stretch_pct = sum(p for p, n in pairs if any(w in n for w in STRETCH))
    if stretch_pct > 5.0:
        return None
    semi = has(SEMI, fibres)
    main = None
    best = -1
    for p, n in pairs:
        for k, v in NATURAL.items():
            if re.search(r"\b" + re.escape(k) + r"\b", n) and p > best:
                main, best = v, p
    if not main and clean100:
        main = NATURAL.get(clean100.group(2), "cotton")
    if not main:
        return None
    kind = "semi" if semi else ("stretch" if stretch_pct > 0 else "natural")
    # First composition group: consecutive pairs summing to ~100.
    comp, tot = [], 0.0
    for p, n in pairs:
        comp.append(f"{p:g}% {n.title()}")
        tot += p
        if tot >= 99.5:
            break
    comp_s = ", ".join(comp) if comp and tot >= 99.5 else (clean100.group(0).replace("  ", " ").title() if clean100 else ", ".join(comp))
    organic = bool(re.search(r"\borganic\b|\bgots\b", low))
    return kind, main, comp_s, organic


TITLE_CTX = {}


def fabric_key(text, main, kind, cat):
    low = text.lower()
    if kind == "semi":
        return "lyocell"
    if kind == "stretch":
        return "stretch-cotton"
    if main == "linen":
        return "cotton-linen" if "cotton" in low and re.search(r"\d+\s*%\s*cotton", low) else "linen"
    if main == "hemp":
        return "hemp-cotton" if "cotton" in low else "hemp"
    if main == "wool":
        return "merino"
    if main == "silk":
        return "silk"
    rules = [(r"waffle", "waffle"), (r"french terry|loopback|terry", "terry"), (r"fleece", "fleece"),
             (r"flannel", "flannel"), (r"corduroy", "corduroy"), (r"seersucker", "seersucker"), (r"gauze", "gauze"),
             (r"poplin", "poplin"), (r"oxford", "oxford"), (r"chambray", "chambray"),
             (r"denim|jean|twill|chino|canvas|duck", "twill"), (r"piqu", "pique"), (r"slub", "slub-jersey"),
             (r"pima|supima", "pima")]
    title = TITLE_CTX.get("t", "").lower()
    for pat, key in rules + [(r"\bribbed\b|\brib\b", "rib")]:
        if re.search(pat, title):
            return key
    for pat, key in rules:
        if re.search(pat, low):
            return key
    if cat in ("shirt", "camp", "pajama", "boxers"):
        return "poplin"
    if cat in ("pants", "widepants", "shorts", "overshirt"):
        return "twill"
    if cat in ("sweater", "cardigan", "socks"):
        return "cotton-knit"
    return "organic-jersey" if re.search(r"\borganic\b", low) else "cotton-jersey"


def category(p):
    ptype = p.get("product_type") or ""
    title = p.get("title") or ""
    if SKIP_TYPES.search(ptype) or SKIP_TITLE.search(title):
        return None
    for hay in (title, ptype):  # the title is more specific than the store's product type
        for pat, cat in CAT_RULES:
            if re.search(pat, hay, re.I):
                if cat == "shirt" and re.search(r"short[- ]sleeve", title, re.I):
                    return "camp"
                if cat == "tee" and re.search(r"long[- ]sleeve", title, re.I):
                    return "longtee"
                return cat
    return None


def dept_of(p, store):
    if store["dept"]:
        return store["dept"]
    hay = " ".join([p.get("product_type") or "", p.get("title") or "", " ".join(p.get("tags") or [])])
    if re.search(r"atr_gender-women|^W-|\bwomen|\bwomens|\bladies", hay, re.I):
        return "w"
    if re.search(r"atr_gender-men|^M-|\bmen'?s\b|\bmen\b|for men", hay, re.I):
        return "m"
    if re.search(r"dress|skirt|blouse|cami|jumpsuit", hay, re.I):
        return "w"
    return "any"


def norm_size(s):
    s = s.strip().upper().replace("XXXL", "3XL").replace("XXL", "2XL").replace("X-LARGE", "XL").replace("EXTRA LARGE", "XL")
    s = {"SMALL": "S", "MEDIUM": "M", "LARGE": "L"}.get(s, s)
    parts = [x.strip() for x in s.split("/")]
    out = []
    for x in parts:
        m = re.match(r"^(\dXL|XS|S|M|L|XL)\b", x)
        if m:
            out.append(m.group(1))
    return out


def size_info(p, cat, dept):
    """Available sizes as {length_label: [sizes]} plus a flag for XL-or-bigger stock."""
    opts = [o["name"].lower() for o in p.get("options", [])]
    def idx(*names):
        for n in names:
            if n in opts:
                return opts.index(n)
        return None
    si = idx("size", "sizes")
    li = idx("length", "inseam")
    avail = {}
    big = False
    for v in p.get("variants", []):
        if not v.get("available"):
            continue
        vals = [v.get("option1"), v.get("option2"), v.get("option3")]
        size = (vals[si] if si is not None else v.get("title")) or ""
        length = (vals[li] if li is not None else "") or ""
        raw = size.strip()
        # Linen stores fold the length into the size ("XL - MAXI length").
        if " - " in raw and not length:
            raw, length = [x.strip() for x in raw.split(" - ", 1)]
            length = re.sub(r"\s*\(.*?\)", "", length)
        letters = norm_size(raw)
        label = None
        if letters:
            label = "/".join(letters)
            if any(SIZE_ORDER.index(x) >= SIZE_ORDER.index("XL") for x in letters):
                big = True
        elif re.fullmatch(r"\d{2}", raw):  # waist (men's/unisex bottoms)
            n = int(raw)
            label = raw
            if dept != "w" and n >= 36:
                big = True
            if dept == "w" and n >= 14:
                big = True
        elif re.fullmatch(r"\d{1,2}", raw):  # women's numeric
            label = raw
            if int(raw) >= 14:
                big = True
        elif re.search(r"one size|os\b", raw, re.I):
            label = "One size"
            big = True
        if not label:
            continue
        key = length.strip() or "Regular"
        if key.isdigit():
            key = key + "″ inseam"
        avail.setdefault(key, [])
        if label not in avail[key]:
            avail[key].append(label)
    return avail, big


def color_of(p):
    opts = p.get("options", [])
    for i, o in enumerate(opts):
        if o["name"].lower() in ("color", "colour", "core colors", "colors") and o.get("values"):
            if len(o["values"]) == 1:
                return o["values"][0]
            for v in p.get("variants", []):  # several colours: the first one in stock
                if v.get("available") and i < 3 and v.get("option" + str(i + 1)):
                    return v["option" + str(i + 1)]
    m = re.search(r"\bin ([A-Z][\w'&/ -]{2,40})$", p.get("title") or "")
    return m.group(1).strip() if m else ""


def color_key(name, title):
    for hay in (name.lower(), title.lower()):
        best = None
        for pat, key in COLOR_RULES:
            m = re.search(pat, hay)
            if m and (best is None or m.start() < best[0]):
                best = (m.start(), key)
        if best:
            return best[1]
    return "raw"


def clean_title(t):
    t = re.sub(r"\s+for\s+(Tall\s+)?(Men|Women|Ladies)\b.*$", "", t, flags=re.I)
    t = re.sub(r"\s+in\s+[A-Z][\w'&/ -]{2,40}$", "", t)
    t = re.sub(r"^(Men'?s|Women'?s)\s+", "", t, flags=re.I)
    return t.strip(" -–|")


def style_key(store_id, p):
    return store_id + ":" + re.sub(r"[^a-z0-9]+", "-", clean_title(p["title"]).lower())


def main():
    want_images = "--no-images" not in sys.argv
    os.makedirs(IMG_DIR, exist_ok=True)
    listings = []
    report = []
    for store in STORES:
        prods = all_products(store["domain"])
        kept, styles = [], {}
        stats = {"products": len(prods), "not_clothing": 0, "synthetic_or_unknown": 0, "no_big_stock": 0}
        for p in prods:
            if re.match(r"^(R:|customized:)", p.get("title") or "", re.I):
                stats["not_clothing"] += 1  # one-off returns and altered pieces
                continue
            cat = category(p)
            if not cat:
                stats["not_clothing"] += 1
                continue
            text = text_of(p.get("body_html"))
            comp = composition(text, store, p.get("title") or "")
            if not comp:
                stats["synthetic_or_unknown"] += 1
                continue
            kind, main_fibre, comp_s, organic = comp
            dept = dept_of(p, store)
            sizes, big = size_info(p, cat, dept)
            if not big or not sizes or not p.get("images"):
                stats["no_big_stock"] += 1
                continue
            cname = color_of(p)
            prices = [float(v["price"]) for v in p["variants"] if v.get("available")]
            rec = {
                "id": f"{store['id']}-{p['id']}",
                "store": store["id"],
                "title": clean_title(p["title"]) or p["title"],
                "fullTitle": p["title"],
                "url": f"https://{store['domain']}/products/{p['handle']}",
                "imgSrc": p["images"][0]["src"],
                "price": min(prices) if prices else None,
                "currency": "USD",
                "comp": comp_s,
                "kind": kind,
                "fiber": main_fibre,
                "fabric": (TITLE_CTX.update(t=p["title"]) or fabric_key(text, main_fibre, kind, cat)),
                "organic": organic,
                "cat": cat,
                "dept": dept,
                "colorName": cname,
                "color": color_key(cname, p["title"]),
                "vibe": VIBE_BY_CAT.get(cat, []),
                "sizes": sizes,
                "tall": store["tall"],
                "updated": (p.get("updated_at") or "")[:10],
            }
            score = LOUNGE.get(cat, 1) + (0.6 if kind == "natural" else 0) + (0.4 if organic else 0) + 0.15 * sum(len(v) for v in sizes.values())
            sk = style_key(store["id"], p)
            styles.setdefault(sk, []).append((score, rec))
        # Up to two colourways per style, best styles first, capped per store.
        ranked = sorted(styles.values(), key=lambda lst: -max(s for s, _ in lst))
        # Alternate menswear and womenswear so neither crowds the other out.
        mens = [l for l in ranked if l[0][1]["dept"] != "w"]
        womens = [l for l in ranked if l[0][1]["dept"] == "w"]
        ranked = [x for pair in zip(mens, womens) for x in pair] + mens[len(womens):] + womens[len(mens):]
        per_cat = {}
        for lst in ranked:
            cat = lst[0][1]["cat"]
            if per_cat.get(cat, 0) >= CAT_CAP.get(cat, 18):
                continue
            seen_colors = set()
            for s, rec in sorted(lst, key=lambda x: -x[0]):
                if rec["colorName"].lower() in seen_colors or len(seen_colors) >= PER_STYLE_COLORS:
                    continue
                seen_colors.add(rec["colorName"].lower())
                kept.append(rec)
                per_cat[cat] = per_cat.get(cat, 0) + 1
            if len(kept) >= store["cap"]:
                break
        kept = kept[: store["cap"]]
        stats["kept"] = len(kept)
        report.append((store["name"], stats))
        listings += kept
        time.sleep(1)

    if want_images:
        for rec in listings:
            fn = rec["id"] + ".jpg"
            path = os.path.join(IMG_DIR, fn)
            rec["img"] = "listings/" + fn
            if os.path.exists(path):
                continue
            src = rec["imgSrc"]
            src = ("https:" + src) if src.startswith("//") else src
            src += ("&" if "?" in src else "?") + "width=480"
            try:
                data = fetch(src, binary=True)
                try:
                    from PIL import Image  # optional recompression
                    im = Image.open(io.BytesIO(data)).convert("RGB")
                    im.thumbnail((480, 640))
                    buf = io.BytesIO()
                    im.save(buf, "JPEG", quality=78, optimize=True, progressive=True)
                    data = buf.getvalue()
                except Exception:  # noqa: BLE001
                    pass
                with open(path, "wb") as f:
                    f.write(data)
            except Exception as e:  # noqa: BLE001
                print("image failed", rec["id"], e, file=sys.stderr)
                rec["img"] = ""
            time.sleep(0.2)
        # Remove thumbnails no longer used.
        keep = {r["id"] + ".jpg" for r in listings}
        for fn in os.listdir(IMG_DIR):
            if fn.endswith(".jpg") and fn not in keep:
                os.remove(os.path.join(IMG_DIR, fn))
    for rec in listings:
        rec.pop("imgSrc", None)

    out = {
        "fetched": time.strftime("%Y-%m-%d"),
        "stores": [{k: s[k] for k in ("id", "name", "domain", "region", "tall", "ships")} for s in STORES],
        "listings": listings,
    }
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        f.write("{\n")
        f.write(f'"fetched": {json.dumps(out["fetched"])},\n')
        f.write(f'"stores": {json.dumps(out["stores"], ensure_ascii=False)},\n')
        f.write('"listings": [\n')
        f.write(",\n".join(json.dumps(r, ensure_ascii=False) for r in listings))
        f.write("\n]\n}\n")
    for name, st in report:
        print(f"{name}: {st}")
    print("total listings:", len(listings))


if __name__ == "__main__":
    main()
