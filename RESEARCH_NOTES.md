# Tall Order: research notes

Checked 2026-11-19. Each fact is marked:

- **[confirmed]**: read on the source page.
- **[snippet]**: seen only in a search-result snippet.
- **[tested]**: URL or site behaviour checked with a script.
- **UNVERIFIED**: not confirmed.

Only confirmed or tested facts are shown in the app as fact. Anything else is worded as advice or left out.

## What the app is

A swipe deck of garment *archetypes*: kinds of items worth hunting for (fabric, cut, colour). These are not product listings. There are no prices, stock or product claims.

A liked card becomes a set of store searches in English, Thai and Chinese. Tall and big-size words are added, and the searches are filtered to the regions you order from (Thailand, USA, China, worldwide).

Natural fibres only. Polyester, nylon and acrylic are never shown. Neither is "bamboo" (see the FTC case below). Lyocell and up to 5% elastane are off by default and can be turned on in Fit.

## Stores used in the app

| Store | Region | What was checked | Search link used |
|---|---|---|---|
| Shopee TH | TH | — | `shopee.co.th/search?keyword=` [tested: HTTP 200, results render in the browser] |
| Lazada TH | TH | MUJI runs an official store on Lazada [snippet: Time Out Bangkok, Brand Inside] | `lazada.co.th/catalog/?q=` (bot wall stopped the test; widely used pattern) |
| Uniqlo TH | TH | "Extra size available from XS - 4XL and special lengths at Online store" [confirmed: uniqlo.com/th/en/special-feature/click-and-collect] | Google `site:uniqlo.com/th` (own search returned 403) |
| Thai tailors | TH | See "Custom tailoring" below | Google Maps search URL (documented Maps URLs format) |
| American Tall | US | Men's Semi-Tall 6'0"–6'3", Tall 6'3"–6'7", Extra Tall 6'8"–7'1". Women's Tall 5'9"–6'1", Extra Tall 6'2"–6'6" [confirmed]. Thailand (THB) is in the ship-to selector [tested]. | `americantall.com/search?q=` [tested] |
| J.Crew | US | Ships to Thailand through ESW with duties included: Express up to 8 business days, Standard up to 13 [confirmed: jcrew.com/help/international-orders] | Google `site:jcrew.com` (own search returned 403) |
| Gap | US | gap.com does not ship abroad and sends buyers to shopgap.com [confirmed]. shopgap.com lists Thailand (THB) and a Tall section of about 1,000 products [tested]. | `shopgap.com/search?q=` [tested] |
| Long Tall Sally | US/UK, women | Women 5'8" and up [snippet]. Thailand shipping UNVERIFIED; the app says so. | Google `site:longtallsally.com` |
| Taobao | CN | Thai-language interface with baht payment since 28 May 2025 [confirmed: Kaohoon International]. Direct delivery to Thailand, without third-party forwarders, plus local returns since October 2025 [confirmed: ThaiPR, 17 Oct 2025]. | `s.taobao.com/search?q=` [tested: HTTP 200; results need sign-in] |
| Son of a Tailor | Worldwide | "We ship worldwide." Made-to-measure from height, weight, age and shoe size, with a free remake guarantee. Pique tee is 100% organic cotton [confirmed]. | Homepage (it has no search URL: `/search` returns 404) |
| ASKET | Worldwide | Tees in Short, Regular and Long lengths; Long adds +3 cm to the body and +1 cm to the sleeve. Sizes XS–XXL. 100% organic long-staple cotton [confirmed]. Thailand is marked shippable in the site data [tested]. | `asket.com/en-ww/search?q=` [tested] |
| Etsy | Worldwide | Linen sellers offering custom length exist [snippet]. Shipping to Thailand varies by shop; the app says to check. | `etsy.com/search?q=` (blocked for scripts) |
| Google Shopping | Worldwide | `udm=28` is the current Shopping tab parameter [snippet]. `tbm=shop` now redirects [tested]. | `google.com/search?udm=28&q=` |

### Considered and left out

- **Duluth Trading:** "We currently do not offer shipping to countries other than Canada and the United States" [confirmed].
- **Proper Cloth:** ships to more than 40 countries, but Thailand is not on the list [confirmed].
- **2Tall (UK):** Thailand is not on its rest-of-world delivery list [confirmed].
- **Jungmaven:** hemp/organic cotton, ships internationally, but men's sizes stop at XL [confirmed]. Too small.
- **Lands' End:** Tall is 6'1"–6'3" with about 2" more body length [snippet]. Thailand shipping UNVERIFIED.
- **L.L.Bean:** Tall is 6'1"–6'3" [snippet]. Thailand shipping UNVERIFIED.
- **DXL:** Thailand shipping UNVERIFIED.
- **Amazon.com:** apparel is often not shippable to Thailand [snippet]. Help pages returned 403.

Any of these can be added once shipping is confirmed.

## Sizing facts used in the Fit tab

- **US tall cuts.** Tall usually adds about 2 in of body length. Gap tall tops M–XL: +2 in; Lands' End shirts: about +2 in; L.L.Bean: +2 in overall [all snippet]. The app says "about 2 in".
- **China, GB/T 1335.1.** Labels follow the format height/chest (or waist for bottoms) plus a body-type letter, e.g. 170/88A. Men's chest-minus-waist bands: Y 17–22, A 12–16, B 7–11, C 2–6 cm. Confirmed on a secondary reference (toolbox365.cn), not the standard's own text. The 2008 edition has applied since 1 Aug 2009 [snippet].
- **Taobao weight charts.** These use 斤 (jin). 1 jin = 500 g, the standard market jin.
- **Thai listings.** A Lazada cotton-tee listing reads "XL รอบอก 44 ยาว 29-30", i.e. chest and length in inches [snippet]. The app frames inches as "usually", not always. The Lazada blog uses เอว (waist) and ความยาว (length) [confirmed].
- **Thai fibre words.** ผ้าลินิน (linen) [confirmed: Lazada blog]. ผ้าใยกัญชง (hemp) [confirmed: Thai PBS].

## Custom tailoring in Thailand

- Asia Times (10 Oct 2019) calls Bangkok "the region's top spot for fast, economical, quality suits": shirts 1,700–3,000 THB, suits from 12,000 THB, 4–5 working days [confirmed].
- City Nomads (updated 18 Nov 2026): shirts from THB 1,500, linen available [confirmed].
- Neither article mentions tall customers. The app's advice to bring a garment that already fits is a reasonable inference, not a sourced claim.
- Northern Thai hemp: the Dao Mang Hmong hemp-fabric community enterprise in Mae Rim, Chiang Mai [confirmed: Thai PBS, 19 Feb 2023].

## Import costs into Thailand

The THB 1,500 de minimis exemption ended on **1 January 2026** (Customs Notification No. 219/2568). Every imported parcel now pays import duty plus 7% VAT, collected at purchase on platforms that signed an MoU with Customs.

Sources [confirmed]:
- Nation Thailand, 22 Dec 2025: https://www.nationthailand.com/business/trade/40060170
- Tilleke & Gibbins, 12 Nov 2025

Earlier, 7% VAT on imports under THB 1,500 had applied from 5 July 2024 [snippet: Bangkok Post headline].

## Scientific and regulatory references (shown in the Fit tab)

1. **Callewaert C, De Maeseneire E, Kerckhof F-M, Verliefde A, Van de Wiele T, Boon N (2014).** "Microbial odor profile of polyester and cotton clothes after a fitness session." *Applied and Environmental Microbiology* 80(21):6611–6619. doi:10.1128/AEM.01422-14. PMID 25128346. PMC4249026. [confirmed]
   - Finding: 26 participants after a spinning session. Polyester shirts smelled significantly less pleasant and more intense than cotton. Micrococci were enriched on polyester.
2. **Napper IE, Thompson RC (2016).** "Release of synthetic microplastic plastic fibres from domestic washing machines: Effects of fabric type and washing conditions." *Marine Pollution Bulletin* 112:39–45. doi:10.1016/j.marpolbul.2016.09.025. [confirmed; issue number 1–2 from snippet]
   - Finding per 6 kg wash: polyester-cotton about 137,951 fibres, polyester 496,030, acrylic 728,789 [confirmed: University of Plymouth release, 27 Sep 2016].
3. **De Falco F, Di Pace E, Cocca M, Avella M (2019).** "The contribution of washing processes of synthetic clothes to microplastic pollution." *Scientific Reports* 9:6633. doi:10.1038/s41598-019-43023-x. PMC6488573. [confirmed]
   - Finding: 124–308 mg of microfibres per kg of washed fabric, about 640,000–1,500,000 microfibres.
4. **US FTC, 8 Apr 2022.** Kohl's paid a $2.5M and Walmart a $3M civil penalty for marketing rayon textiles as "bamboo" and making false environmental claims. [confirmed]
   - https://www.ftc.gov/news-events/news/press-releases/2022/04/ftc-uses-penalty-offense-authority-seek-largest-ever-civil-penalty-bogus-bamboo-marketing-kohls
5. **GOTS Key Features.** An "organic" label requires at least 95% certified organic fibres; "made with organic materials" requires at least 70%. [confirmed: https://global-standards.org/our-standards/gots/key-features]
6. **OEKO-TEX Standard 100** is "a label for textiles tested for harmful substances." Hohenstein: "STANDARD 100 is not an eco/sustainability claim." Organic origin is certified separately (ORGANIC COTTON by OEKO-TEX). [confirmed]
7. **Cotton Incorporated (2004), ISP 1009,** "A Guide to Improved Shrinkage Performance of Cotton Fabrics." An industry technical bulletin, not peer-reviewed. [confirmed]
   - Knits are especially prone to shrinkage.
   - One wetting-and-drying cycle "may remove around 90% of the total shrinkage available."
   - Most relaxation happens during tumble drying.
   - https://www.cottoninc.com/wp-content/uploads/2017/12/ISP-1009-Guide-to-Improved-Shrinkage-Performance-of-Cotton-Fabrics.pdf

### Deliberately not used

- **ASTM D1909 moisture-regain values** (cotton 8.5%, polyester 0.4%, etc.) appeared only in snippets and an unauthorised copy of the standard. They are left out until checked against a purchased copy.
- **"Wearing sheds more than washing"** comes from a different De Falco paper (*Environmental Science & Technology*). It was not verified and is not cited.
