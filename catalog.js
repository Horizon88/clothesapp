/* Tall Order: catalog data.
 *
 * These are garment archetypes, not product listings. Each card describes a
 * kind of item worth hunting for (fabric, cut, colour), and the app turns a
 * liked card into store searches in English, Thai and Chinese.
 * Nothing here is a real product, price or stock claim.
 */

window.TO_DATA = (function () {
  // Natural-dye and undyed tones. `fam` drives taste learning.
  const COLORS = {
    bone:     { name: "Bone",          hex: "#EEEBE3", fam: "neutral" },
    raw:      { name: "Undyed",        hex: "#DCD3C0", fam: "neutral" },
    oat:      { name: "Oat",           hex: "#C9B795", fam: "neutral" },
    sand:     { name: "Sand",          hex: "#D3C09C", fam: "neutral" },
    heather:  { name: "Heather grey",  hex: "#A4A7AE", fam: "neutral" },
    charcoal: { name: "Charcoal",      hex: "#4A4D55", fam: "dark" },
    ebony:    { name: "Ebony black",   hex: "#25262B", fam: "dark" },
    navy:     { name: "Navy",          hex: "#25304B", fam: "dark" },
    deepindigo:{ name: "Deep indigo",  hex: "#1F2650", fam: "blue" },
    indigo:   { name: "Indigo",        hex: "#34477F", fam: "blue" },
    sky:      { name: "Washed sky",    hex: "#93B2CE", fam: "blue" },
    sage:     { name: "Sage",          hex: "#A6B497", fam: "green" },
    moss:     { name: "Moss",          hex: "#516C4B", fam: "green" },
    olive:    { name: "Olive",         hex: "#6C6F45", fam: "green" },
    clay:     { name: "Clay",          hex: "#AF6A4E", fam: "earth" },
    rust:     { name: "Rust",          hex: "#A4532F", fam: "earth" },
    turmeric: { name: "Turmeric",      hex: "#D6A03B", fam: "earth" },
    lac:      { name: "Lac red",       hex: "#9C3036", fam: "earth" }
  };

  const COLOR_FAMILIES = {
    neutral: "Undyed & neutrals",
    dark: "Darks",
    blue: "Indigo & blues",
    green: "Greens",
    earth: "Earth reds & yellows"
  };

  // breath: 1-5, how comfortable in Thai heat and humidity.
  // kind: natural | semi (regenerated cellulose) | stretch (natural + a little elastane)
  const FABRICS = {
    "organic-jersey": { label: "Organic cotton jersey", fiber: "cotton", tex: "jersey", breath: 4, kind: "natural", organic: true },
    "cotton-jersey":  { label: "Cotton jersey",         fiber: "cotton", tex: "jersey", breath: 4, kind: "natural" },
    "heavy-jersey":   { label: "Heavyweight cotton",    fiber: "cotton", tex: "jersey", breath: 3, kind: "natural" },
    "slub-jersey":    { label: "Slub cotton jersey",    fiber: "cotton", tex: "slub",   breath: 4, kind: "natural" },
    "pima":           { label: "Pima cotton",           fiber: "cotton", tex: "jersey", breath: 4, kind: "natural" },
    "pique":          { label: "Cotton piqué",          fiber: "cotton", tex: "waffle", breath: 4, kind: "natural" },
    "rib":            { label: "Cotton rib",            fiber: "cotton", tex: "rib",    breath: 4, kind: "natural" },
    "waffle":         { label: "Cotton waffle",         fiber: "cotton", tex: "waffle", breath: 4, kind: "natural" },
    "terry":          { label: "Cotton French terry",   fiber: "cotton", tex: "terry",  breath: 3, kind: "natural", organic: true },
    "fleece":         { label: "Brushed cotton fleece", fiber: "cotton", tex: "terry",  breath: 2, kind: "natural" },
    "poplin":         { label: "Cotton poplin",         fiber: "cotton", tex: "poplin", breath: 4, kind: "natural" },
    "gauze":          { label: "Cotton double gauze",   fiber: "cotton", tex: "gauze",  breath: 5, kind: "natural" },
    "seersucker":     { label: "Cotton seersucker",     fiber: "cotton", tex: "seersucker", breath: 5, kind: "natural" },
    "chambray":       { label: "Cotton chambray",       fiber: "cotton", tex: "twill",  breath: 4, kind: "natural" },
    "oxford":         { label: "Cotton oxford",         fiber: "cotton", tex: "twill",  breath: 3, kind: "natural" },
    "twill":          { label: "Cotton twill",          fiber: "cotton", tex: "twill",  breath: 3, kind: "natural" },
    "flannel":        { label: "Cotton flannel",        fiber: "cotton", tex: "plaid",  breath: 2, kind: "natural" },
    "corduroy":       { label: "Cotton corduroy",       fiber: "cotton", tex: "cord",   breath: 1, kind: "natural" },
    "cotton-knit":    { label: "Cotton knit",           fiber: "cotton", tex: "knit",   breath: 3, kind: "natural" },
    "indigo":         { label: "Indigo-dyed cotton",    fiber: "cotton", tex: "twill",  breath: 4, kind: "natural" },
    "khaoma":         { label: "Handwoven cotton check",fiber: "cotton", tex: "plaid",  breath: 5, kind: "natural" },
    "linen":          { label: "Linen",                 fiber: "linen",  tex: "linen",  breath: 5, kind: "natural" },
    "linen-jersey":   { label: "Linen jersey",          fiber: "linen",  tex: "slub",   breath: 5, kind: "natural" },
    "cotton-linen":   { label: "Cotton-linen",          fiber: "linen",  tex: "linen",  breath: 5, kind: "natural" },
    "hemp":           { label: "Hemp",                  fiber: "hemp",   tex: "hemp",   breath: 5, kind: "natural" },
    "hemp-cotton":    { label: "Hemp-cotton",           fiber: "hemp",   tex: "hemp",   breath: 4, kind: "natural" },
    "merino":         { label: "Lightweight merino",    fiber: "wool",   tex: "knit",   breath: 4, kind: "natural" },
    "silk":           { label: "Washable silk",         fiber: "silk",   tex: "silk",   breath: 4, kind: "natural" },
    "lyocell":        { label: "Lyocell (Tencel)",      fiber: "lyocell",tex: "silk",   breath: 4, kind: "semi" },
    "stretch-cotton": { label: "Cotton + 5% elastane",  fiber: "cotton", tex: "jersey", breath: 3, kind: "stretch" }
  };

  // Garment drawing + which measurements matter for a tall body.
  const CATEGORIES = {
    tee:       { label: "Tee",            group: "Tops",       fit: ["len", "chest"] },
    tank:      { label: "Tank",           group: "Tops",       fit: ["len", "chest"] },
    henley:    { label: "Henley",         group: "Tops",       fit: ["len", "chest", "sleeve"] },
    longtee:   { label: "Long-sleeve",    group: "Tops",       fit: ["len", "chest", "sleeve"] },
    polo:      { label: "Polo",           group: "Tops",       fit: ["len", "chest"] },
    camp:      { label: "Camp shirt",     group: "Shirts",     fit: ["len", "chest"] },
    shirt:     { label: "Shirt",          group: "Shirts",     fit: ["len", "chest", "sleeve"] },
    workshirt: { label: "Work shirt",     group: "Shirts",     fit: ["len", "chest", "sleeve"] },
    overshirt: { label: "Overshirt",      group: "Shirts",     fit: ["len", "chest", "sleeve"] },
    kurta:     { label: "Tunic",          group: "Shirts",     fit: ["len", "chest", "sleeve"] },
    hoodie:    { label: "Hoodie",         group: "Layers",     fit: ["len", "chest", "sleeve"] },
    sweat:     { label: "Sweatshirt",     group: "Layers",     fit: ["len", "chest", "sleeve"] },
    cardigan:  { label: "Cardigan",       group: "Layers",     fit: ["len", "chest", "sleeve"] },
    pants:     { label: "Trousers",       group: "Bottoms",    fit: ["inseam", "waist"] },
    widepants: { label: "Wide trousers",  group: "Bottoms",    fit: ["inseam", "waist"] },
    fisherman: { label: "Fisherman pants",group: "Bottoms",    fit: ["outseam"] },
    joggers:   { label: "Joggers",        group: "Bottoms",    fit: ["inseam", "waist"] },
    shorts:    { label: "Shorts",         group: "Bottoms",    fit: ["waist"] },
    pajama:    { label: "Sleep set",      group: "Sleep",      fit: ["len", "inseam"] },
    robe:      { label: "Robe",           group: "Sleep",      fit: ["height"] },
    boxers:    { label: "Boxers",         group: "Basics",     fit: ["waist"] },
    socks:     { label: "Socks",          group: "Basics",     fit: ["shoe"] },
    wrap:      { label: "Wrap cloth",     group: "Basics",     fit: [] },
    dress:     { label: "Dress",          group: "Dresses",    fit: ["height", "chest"] },
    jumpsuit:  { label: "Jumpsuit",       group: "Dresses",    fit: ["torso", "inseam"] }
  };

  const VIBES = {
    minimal: "Clean basics",
    resort: "Resort & beach",
    cozy: "Cozy",
    workwear: "Workwear",
    smart: "Smart-casual",
    heritage: "Thai heritage",
    sleep: "Sleep"
  };

  /* Archetypes. terms.en is searched on US / global stores, terms.th on Shopee
   * and Lazada, terms.zh on Taobao. Tall and big-size words are added per
   * store, so they are left out here. */
  const ITEMS = [
    // ---------- Tees & tops
    { id: "tee-heavy", name: "Heavyweight crew tee", cat: "tee", fabric: "heavy-jersey", colors: ["bone", "ebony"], vibe: ["minimal"], dept: "any",
      why: "Thick cotton that holds its shape and does not cling. The tall-tee workhorse.",
      terms: { en: "heavyweight 100% cotton t-shirt", th: "เสื้อยืด ผ้าฝ้าย 100% ผ้าหนา", zh: "重磅 纯棉 T恤" } },
    { id: "tee-organic", name: "Organic cotton crew tee", cat: "tee", fabric: "organic-jersey", colors: ["raw", "indigo"], vibe: ["minimal"], dept: "any",
      why: "Look for GOTS on the label. Softer hand, fewer finishing chemicals.",
      terms: { en: "organic cotton t-shirt GOTS", th: "เสื้อยืด ผ้าฝ้ายออร์แกนิค", zh: "有机棉 T恤" } },
    { id: "tee-pocket", name: "Pima pocket tee", cat: "tee", fabric: "pima", colors: ["heather", "olive"], vibe: ["minimal"], dept: "any",
      why: "Long-staple cotton feels smoother and tends to pill less.",
      terms: { en: "pima cotton pocket t-shirt", th: "เสื้อยืด ผ้าฝ้าย มีกระเป๋า", zh: "匹马棉 口袋 T恤" } },
    { id: "tee-hemp", name: "Hemp-cotton tee", cat: "tee", fabric: "hemp-cotton", colors: ["sand", "moss"], vibe: ["minimal", "workwear"], dept: "any",
      why: "Hemp breathes like linen and softens with every wash.",
      terms: { en: "hemp cotton t-shirt", th: "เสื้อยืด ใยกัญชง", zh: "汉麻 棉 T恤" } },
    { id: "tee-mtm", name: "Made-to-measure tee", cat: "tee", fabric: "organic-jersey", colors: ["navy", "bone"], vibe: ["minimal"], dept: "any",
      why: "Skip the size chart. You give height, weight and a few details; it is cut to you.",
      terms: { en: "made to measure organic cotton t-shirt", th: "สั่งตัด เสื้อยืด ผ้าฝ้าย", zh: "定制 纯棉 T恤 按尺寸" } },
    { id: "tee-indigo", name: "Hand-dyed indigo tee", cat: "tee", fabric: "indigo", colors: ["indigo", "deepindigo"], vibe: ["heritage", "minimal"], dept: "any",
      why: "Natural indigo fades softly. Thailand still dyes it by hand, from Phrae in the north to Sakon Nakhon.",
      terms: { en: "natural indigo dyed cotton t-shirt", th: "เสื้อยืด ย้อมคราม", zh: "植物蓝染 纯棉 T恤" } },
    { id: "tee-linen", name: "Linen jersey tee", cat: "tee", fabric: "linen-jersey", colors: ["sage", "raw"], vibe: ["resort", "minimal"], dept: "any",
      why: "A knit tee made of linen: drapes away from the body on sticky days.",
      terms: { en: "linen jersey t-shirt", th: "เสื้อยืด ผ้าลินิน", zh: "亚麻 针织 T恤" } },
    { id: "tank-rib", name: "Ribbed cotton tank", cat: "tank", fabric: "rib", colors: ["bone", "ebony"], vibe: ["minimal", "sleep"], dept: "any",
      why: "Peak heat at home. Rib stretches without needing synthetic fibre.",
      terms: { en: "ribbed cotton tank top", th: "เสื้อกล้าม ผ้าฝ้าย", zh: "纯棉 罗纹 背心" } },
    { id: "henley-waffle", name: "Waffle henley, long sleeve", cat: "henley", fabric: "waffle", colors: ["oat", "charcoal"], vibe: ["cozy"], dept: "any",
      why: "For air-conditioned evenings. Waffle traps a little warmth and still breathes.",
      terms: { en: "cotton waffle henley long sleeve", th: "เสื้อแขนยาว ผ้าวาฟเฟิล ผ้าฝ้าย", zh: "纯棉 华夫格 亨利衫 长袖" } },
    { id: "henley-slub", name: "Slub henley, short sleeve", cat: "henley", sleeve: "short", fabric: "slub-jersey", colors: ["clay", "sky"], vibe: ["resort", "minimal"], dept: "any",
      why: "Placket at the neck lets heat out. Slub texture hides wrinkles.",
      terms: { en: "slub cotton henley short sleeve", th: "เสื้อเฮนลี่ ผ้าฝ้าย แขนสั้น", zh: "竹节棉 亨利领 短袖" } },
    { id: "longtee-merino", name: "Lightweight merino long-sleeve", cat: "longtee", fabric: "merino", colors: ["charcoal", "navy"], vibe: ["minimal"], dept: "any",
      why: "Thin, warm and breathable. For flights and freezing offices.",
      terms: { en: "merino wool long sleeve t-shirt", th: "เสื้อ ขนแกะเมอริโน แขนยาว", zh: "美利奴羊毛 长袖 T恤" } },
    { id: "polo-pique", name: "Cotton piqué polo", cat: "polo", fabric: "pique", colors: ["navy", "sand"], vibe: ["smart"], dept: "any",
      why: "Collar for dinner out, open knit for the heat. Check the body length.",
      terms: { en: "100% cotton pique polo shirt", th: "เสื้อโปโล ผ้าฝ้าย 100%", zh: "纯棉 珠地 POLO衫" } },

    // ---------- Shirts
    { id: "camp-linen", name: "Linen camp-collar shirt", cat: "camp", fabric: "linen", colors: ["sky", "raw"], vibe: ["resort"], dept: "any",
      why: "The best hot-weather shirt there is. Boxy cut, so length matters more than chest.",
      terms: { en: "linen camp collar shirt short sleeve", th: "เสื้อเชิ้ต ผ้าลินิน แขนสั้น คอปก", zh: "亚麻 古巴领 短袖 衬衫" } },
    { id: "shirt-linen", name: "Long-sleeve linen shirt", cat: "shirt", fabric: "linen", colors: ["bone", "indigo"], vibe: ["resort", "smart"], dept: "any",
      why: "Sleeves are the hardest fit for long arms. Roll them, but buy them long.",
      terms: { en: "100% linen shirt long sleeve", th: "เสื้อเชิ้ต ผ้าลินิน แขนยาว", zh: "纯亚麻 长袖 衬衫" } },
    { id: "shirt-gauze", name: "Double-gauze shirt", cat: "shirt", fabric: "gauze", colors: ["sage", "oat"], vibe: ["resort", "cozy"], dept: "any",
      why: "Two airy layers of cotton. Feels like wearing a soft towel that breathes.",
      terms: { en: "cotton double gauze shirt", th: "เสื้อเชิ้ต ผ้าฝ้าย ดับเบิ้ลก๊อซ", zh: "双层纱 纯棉 衬衫" } },
    { id: "camp-seersucker", name: "Seersucker short-sleeve shirt", cat: "camp", fabric: "seersucker", colors: ["sky", "navy"], vibe: ["resort", "smart"], dept: "any",
      why: "The puckers hold fabric off your skin. Built for humidity.",
      terms: { en: "cotton seersucker shirt short sleeve", th: "เสื้อเชิ้ต ผ้าซีซักเกอร์", zh: "泡泡纱 纯棉 短袖 衬衫" } },
    { id: "mohom", name: "Mor hom indigo shirt", cat: "workshirt", fabric: "indigo", colors: ["deepindigo", "indigo"], vibe: ["heritage", "workwear"], dept: "any",
      why: "Phrae's indigo cotton work shirt. Loose, collarless, made in Thailand.",
      terms: { en: "mor hom indigo cotton shirt Thailand", th: "เสื้อม่อฮ่อม ไซส์ใหญ่", zh: "泰国 蓝染 棉 衬衫" } },
    { id: "chambray", name: "Chambray work shirt", cat: "overshirt", fabric: "chambray", colors: ["sky", "indigo"], vibe: ["workwear"], dept: "any",
      why: "Lighter than denim, tougher than poplin. Wears open over a tee.",
      terms: { en: "cotton chambray work shirt", th: "เสื้อเชิ้ต ผ้าแชมเบรย์", zh: "纯棉 青年布 工装衬衫" } },
    { id: "oxford", name: "Oxford button-down", cat: "shirt", fabric: "oxford", colors: ["sky", "bone"], vibe: ["smart"], dept: "any",
      why: "The one shirt for appointments. Tall sizes add sleeve and tail.",
      terms: { en: "cotton oxford button down shirt", th: "เสื้อเชิ้ต อ็อกซ์ฟอร์ด ผ้าฝ้าย", zh: "纯棉 牛津纺 衬衫" } },
    { id: "flannel", name: "Cotton flannel shirt", cat: "shirt", fabric: "flannel", colors: ["lac", "olive"], vibe: ["cozy", "workwear"], dept: "any",
      why: "For freezing malls, cinemas and long flights. Not for the street.",
      terms: { en: "100% cotton flannel shirt", th: "เสื้อเชิ้ต แฟลนเนล ผ้าฝ้าย", zh: "纯棉 法兰绒 格子衬衫" } },
    { id: "kurta", name: "Cotton-linen tunic", cat: "kurta", fabric: "cotton-linen", colors: ["raw", "sage"], vibe: ["resort", "heritage"], dept: "any",
      why: "Tunics are meant to be long, so a tall frame finally gets the right proportion.",
      terms: { en: "cotton linen kurta tunic long", th: "เสื้อคลุม ผ้าฝ้าย ลินิน ตัวยาว", zh: "棉麻 长款 套头衫" } },
    { id: "camp-silk", name: "Washable silk camp shirt", cat: "camp", fabric: "silk", colors: ["ebony", "olive"], vibe: ["smart", "resort"], dept: "any",
      why: "Cool to the touch and dresses up. Check that it is labelled washable.",
      terms: { en: "washable silk shirt short sleeve", th: "เสื้อเชิ้ต ผ้าไหม แขนสั้น", zh: "真丝 短袖 衬衫" } },
    { id: "lyocell-shirt", name: "Lyocell drape shirt", cat: "camp", fabric: "lyocell", colors: ["sage", "charcoal"], vibe: ["resort"], dept: "any",
      why: "Wood-pulp fibre, not plastic. Silky and cool. Only shown if you allow it.",
      terms: { en: "tencel lyocell shirt", th: "เสื้อเชิ้ต ผ้าเทนเซล", zh: "天丝 衬衫" } },

    // ---------- Layers
    { id: "hoodie-terry", name: "Organic French terry hoodie", cat: "hoodie", fabric: "terry", colors: ["heather", "charcoal"], vibe: ["cozy"], dept: "any",
      why: "Loopback cotton, no fleece lining. Long body so it covers your waist when you reach up.",
      terms: { en: "organic cotton french terry hoodie", th: "เสื้อฮู้ด ผ้าฝ้าย 100%", zh: "有机棉 毛圈 连帽卫衣" } },
    { id: "sweat-crew", name: "Loopback crew sweatshirt", cat: "sweat", fabric: "terry", colors: ["oat", "navy"], vibe: ["cozy", "minimal"], dept: "any",
      why: "AC-room layer. Ribbed cuffs keep long sleeves where they belong.",
      terms: { en: "100% cotton crewneck sweatshirt", th: "เสื้อสเวตเตอร์ ผ้าฝ้าย 100%", zh: "纯棉 圆领 卫衣" } },
    { id: "cardigan", name: "Cotton knit cardigan", cat: "cardigan", fabric: "cotton-knit", colors: ["oat", "moss"], vibe: ["cozy", "smart"], dept: "any",
      why: "Throw-on warmth without the itch. Cotton, not acrylic.",
      terms: { en: "100% cotton knit cardigan", th: "เสื้อคาร์ดิแกน ไหมพรม ผ้าฝ้าย 100%", zh: "纯棉 针织 开衫" } },
    { id: "chore-hemp", name: "Hemp chore jacket", cat: "overshirt", fabric: "hemp", colors: ["olive", "ebony"], vibe: ["workwear"], dept: "any",
      why: "Four pockets, unlined, breathable. The jacket for rainy season.",
      terms: { en: "hemp chore jacket", th: "เสื้อแจ็คเก็ต ใยกัญชง", zh: "汉麻 工装 外套" } },

    // ---------- Bottoms
    { id: "pants-linen", name: "Drawstring linen trousers", cat: "pants", fabric: "linen", colors: ["raw", "ebony"], vibe: ["resort", "minimal"], dept: "any",
      why: "Hot-day trousers. Elastic waist forgives, but inseam does not. Check it.",
      terms: { en: "linen drawstring pants", th: "กางเกงขายาว ผ้าลินิน เอวยางยืด", zh: "亚麻 松紧腰 长裤" } },
    { id: "fisherman", name: "Thai fisherman pants", cat: "fisherman", fabric: "cotton-jersey", colors: ["indigo", "ebony"], vibe: ["heritage", "resort"], dept: "any",
      why: "Wrap waist fits any body. Many run short on tall legs, so check total length.",
      terms: { en: "thai fisherman pants cotton long", th: "กางเกงเล ผ้าฝ้าย ขายาว", zh: "泰国 渔夫裤 纯棉" } },
    { id: "joggers", name: "French terry joggers", cat: "joggers", fabric: "terry", colors: ["heather", "charcoal"], vibe: ["cozy"], dept: "any",
      why: "Cuffed hems mean a slightly short inseam still looks intentional.",
      terms: { en: "100% cotton french terry joggers", th: "กางเกงจ๊อกเกอร์ ผ้าฝ้าย 100%", zh: "纯棉 毛圈 束脚 卫裤" } },
    { id: "sweatpants", name: "Open-hem sweatpants", cat: "pants", fabric: "fleece", colors: ["oat", "navy"], vibe: ["cozy"], dept: "any",
      why: "Straight leg for cool evenings. Buy tall inseam, never regular.",
      terms: { en: "100% cotton sweatpants open hem", th: "กางเกงวอร์ม ผ้าฝ้าย ขาตรง", zh: "纯棉 直筒 卫裤" } },
    { id: "shorts-linen", name: "Linen drawstring shorts", cat: "shorts", fabric: "linen", colors: ["sand", "olive"], vibe: ["resort"], dept: "any",
      why: "Shorts dodge the inseam problem entirely. Aim for a 7–9 inch leg.",
      terms: { en: "linen drawstring shorts", th: "กางเกงขาสั้น ผ้าลินิน", zh: "亚麻 松紧腰 短裤" } },
    { id: "shorts-terry", name: "Terry lounge shorts", cat: "shorts", fabric: "terry", colors: ["sage", "charcoal"], vibe: ["cozy", "minimal"], dept: "any",
      why: "Sweatshorts in plain cotton. The sofa uniform.",
      terms: { en: "100% cotton french terry shorts", th: "กางเกงขาสั้น ผ้าฝ้าย 100%", zh: "纯棉 毛圈 短裤" } },
    { id: "chino", name: "Garment-dyed chinos", cat: "pants", fabric: "twill", colors: ["olive", "sand"], vibe: ["smart", "workwear"], dept: "any",
      why: "Dyed after sewing, so most of the shrinking has already happened.",
      terms: { en: "100% cotton garment dyed chinos", th: "กางเกงชิโน่ ผ้าฝ้าย 100%", zh: "纯棉 成衣染色 休闲裤" } },
    { id: "pants-hemp", name: "Hemp utility pants", cat: "pants", fabric: "hemp", colors: ["moss", "rust"], vibe: ["workwear"], dept: "any",
      why: "Strong as canvas, airy as linen.",
      terms: { en: "hemp pants", th: "กางเกง ใยกัญชง", zh: "汉麻 长裤" } },
    { id: "pants-gauze", name: "Double-gauze wide pants", cat: "widepants", fabric: "gauze", colors: ["raw", "indigo"], vibe: ["resort", "cozy"], dept: "any",
      why: "Wide legs move air. The most comfortable thing on this list.",
      terms: { en: "cotton double gauze wide leg pants", th: "กางเกงขากว้าง ผ้าฝ้าย", zh: "双层纱 纯棉 阔腿裤" } },
    { id: "cords", name: "Corduroy trousers", cat: "pants", fabric: "corduroy", colors: ["rust", "olive"], vibe: ["cozy", "smart"], dept: "any",
      why: "For travel to cold places. Ignore in Bangkok.",
      terms: { en: "100% cotton corduroy pants", th: "กางเกงลูกฟูก ผ้าฝ้าย", zh: "纯棉 灯芯绒 裤子" } },
    { id: "stretch-chino", name: "Stretch cotton chinos", cat: "pants", fabric: "stretch-cotton", colors: ["navy", "charcoal"], vibe: ["smart"], dept: "any",
      why: "A little elastane for long legs that sit and stand a lot. Only shown if you allow stretch.",
      terms: { en: "cotton stretch chinos", th: "กางเกงชิโน่ ผ้ายืด", zh: "棉 弹力 休闲裤" } },

    // ---------- Sleep & lounge
    { id: "pj-poplin", name: "Poplin pajama set", cat: "pajama", fabric: "poplin", colors: ["sky", "bone"], vibe: ["sleep"], dept: "any",
      why: "Crisp cotton for hot nights. Tall sets fix the ankle-flash problem.",
      terms: { en: "100% cotton poplin pajama set", th: "ชุดนอน ผ้าฝ้าย 100%", zh: "纯棉 府绸 睡衣 套装" } },
    { id: "pj-gauze", name: "Gauze sleep set", cat: "pajama", fabric: "gauze", colors: ["sage", "oat"], vibe: ["sleep", "cozy"], dept: "any",
      why: "The softest sleepwear fabric. Gauze gets better with washing.",
      terms: { en: "cotton gauze pajama set", th: "ชุดนอน ผ้าฝ้าย ผ้าก๊อซ", zh: "双层纱 纯棉 睡衣 套装" } },
    { id: "robe-waffle", name: "Long waffle robe", cat: "robe", fabric: "waffle", colors: ["bone", "charcoal"], vibe: ["sleep", "cozy"], dept: "any",
      why: "Most robes stop above a tall knee. Look for a listed length.",
      terms: { en: "cotton waffle robe long", th: "เสื้อคลุมอาบน้ำ ผ้าฝ้าย ตัวยาว", zh: "纯棉 华夫格 浴袍 加长" } },
    { id: "robe-linen", name: "Linen kimono robe", cat: "robe", fabric: "linen", colors: ["indigo", "clay"], vibe: ["sleep", "resort"], dept: "any",
      why: "Light enough for a Thai morning. Dries fast in humidity.",
      terms: { en: "linen kimono robe", th: "เสื้อคลุม ผ้าลินิน", zh: "亚麻 和服 浴袍" } },
    { id: "boxers", name: "Woven cotton boxers", cat: "boxers", fabric: "poplin", colors: ["navy", "sky"], vibe: ["sleep", "minimal"], dept: "any",
      why: "Loose woven cotton dries fast and stays cool.",
      terms: { en: "100% cotton woven boxers", th: "บ็อกเซอร์ ผ้าฝ้าย 100%", zh: "纯棉 梭织 平角 内裤" } },
    { id: "socks", name: "Cotton crew socks, big sizes", cat: "socks", fabric: "cotton-knit", colors: ["ebony", "oat"], vibe: ["minimal"], dept: "any",
      why: "Big feet often come with tall. Look for sizes that list 46+ EU.",
      terms: { en: "cotton crew socks big size", th: "ถุงเท้า ผ้าฝ้าย ไซส์ใหญ่", zh: "纯棉 袜子 大码" } },
    { id: "khaoma", name: "Pha khao ma wrap", cat: "wrap", fabric: "khaoma", colors: ["lac", "indigo"], vibe: ["heritage", "resort"], dept: "any",
      why: "Thailand's all-purpose cotton cloth: sarong, towel, scarf. No length problem at all.",
      terms: { en: "pha khao ma thai cotton cloth", th: "ผ้าขาวม้า ผ้าฝ้าย", zh: "泰国 格子 棉布 纱笼" } },

    // ---------- Dresses (shown for womenswear)
    { id: "dress-linen", name: "Linen shirt dress", cat: "dress", fabric: "linen", colors: ["raw", "olive"], vibe: ["resort", "smart"], dept: "w",
      why: "Tall cuts move the waist seam down to where yours is.",
      terms: { en: "linen shirt dress tall", th: "เดรส ผ้าลินิน ตัวยาว", zh: "亚麻 衬衫裙 长款" } },
    { id: "dress-gauze", name: "Gauze maxi dress", cat: "dress", fabric: "gauze", colors: ["indigo", "clay"], vibe: ["resort", "cozy"], dept: "w",
      why: "A maxi that actually reaches the ankle on a tall frame.",
      terms: { en: "cotton gauze maxi dress", th: "เดรสยาว ผ้าฝ้าย", zh: "纯棉 纱 长裙" } },
    { id: "jumpsuit", name: "Linen jumpsuit, long torso", cat: "jumpsuit", fabric: "linen", colors: ["sand", "navy"], vibe: ["resort", "workwear"], dept: "w",
      why: "Torso length is the make-or-break measurement here.",
      terms: { en: "linen jumpsuit tall", th: "จั๊มสูท ผ้าลินิน", zh: "亚麻 连体裤 加长" } }
  ];

  /* Store links. {q} is the URL-encoded query. Every entry was checked on
   * 2026-11-19; see RESEARCH_NOTES.md for sources and what is unconfirmed.
   * Stores whose own search page could not be confirmed are searched through
   * Google with a site: filter instead of guessing their URL format.
   */
  const LINENISH = (item, fab) => fab.fiber === "linen" || fab.fiber === "hemp" || item.fabric === "gauze";
  const site = (domain) => "https://www.google.com/search?q=site%3A" + domain + "+{q}";

  const STORES = [
    // Thailand
    { id: "shopee", name: "Shopee", region: "TH", lang: "th", suffix: "ไซส์ใหญ่",
      url: "https://shopee.co.th/search?keyword={q}",
      note: "Thai marketplace. Filter by seller ratings and read the size chart in inches." },
    { id: "lazada", name: "Lazada", region: "TH", lang: "th", suffix: "ไซส์ใหญ่",
      url: "https://www.lazada.co.th/catalog/?q={q}",
      note: "Thai marketplace; MUJI has an official store here." },
    { id: "uniqlo", name: "Uniqlo TH", region: "TH", lang: "en", groups: ["Tops", "Shirts", "Layers", "Bottoms", "Sleep"],
      url: site("uniqlo.com/th"),
      note: "Uniqlo Thailand's online store carries extra sizes up to 4XL and special lengths. Check fibre content: not everything is natural." },
    { id: "tailor", name: "Tailors near you", region: "TH", lang: "en", groups: ["Shirts", "Bottoms", "Sleep", "Dresses"],
      query: (item, fab) => "tailor " + fab.fiber + " " + (item.cat === "pants" || item.cat === "widepants" ? "trousers" : "shirt"),
      url: "https://www.google.com/maps/search/?api=1&query={q}",
      note: "Bangkok tailors make shirts in a few days. Bring a garment that fits and your own linen if you like." },

    // USA (all confirmed to offer Thailand at checkout, unless noted)
    { id: "americantall", name: "American Tall", region: "US", lang: "en",
      url: "https://americantall.com/search?q={q}",
      note: "Everything is tall-only. Men 6'0\"–7'1\", women 5'9\"–6'6\". Thailand is in their ship-to list." },
    { id: "jcrew", name: "J.Crew", region: "US", lang: "en", suffix: "tall",
      url: site("jcrew.com"),
      note: "Ships to Thailand with duties included in the price." },
    { id: "gap", name: "Gap", region: "US", lang: "en", suffix: "tall",
      url: "https://www.shopgap.com/search?q={q}",
      note: "Gap's international site ships to Thailand and has a large tall section." },
    { id: "lts", name: "Long Tall Sally", region: "US", dept: "w", lang: "en",
      url: site("longtallsally.com"),
      note: "Women's tall specialist (5'8\" and up). Thailand shipping not confirmed: check at checkout." },

    // China
    { id: "taobao", name: "Taobao", region: "CN", lang: "zh", suffix: "加长 大码",
      url: "https://s.taobao.com/search?q={q}",
      note: "Taobao has a Thai-language app with baht prices and direct delivery to Thailand. Sign in to see results." },

    // Ships worldwide
    { id: "sonofatailor", name: "Son of a Tailor", region: "Global", lang: "en",
      match: (item) => ["tee", "tank", "henley", "longtee", "polo"].includes(item.cat),
      url: "https://www.sonofatailor.com/",
      note: "Made-to-measure tees from your height, weight and shoe size. Ships worldwide; free remake if it doesn't fit." },
    { id: "asket", name: "ASKET", region: "Global", lang: "en",
      match: (item) => ["tee", "longtee", "henley", "polo", "shirt", "sweat"].includes(item.cat),
      url: "https://www.asket.com/en-ww/search?q={q}",
      note: "Tees come in a Long length (+3 cm body). Sizes stop at XXL. Ships to Thailand." },
    { id: "etsy", name: "Etsy custom length", region: "Global", lang: "en", suffix: "custom length",
      match: LINENISH,
      url: "https://www.etsy.com/search?q={q}",
      note: "Small linen and hemp makers who sew to your measurements. Check each shop ships to Thailand." },
    { id: "google", name: "Google Shopping", region: "Global", lang: "en", suffix: "tall",
      url: "https://www.google.com/search?udm=28&q={q}",
      note: "Wide net across every store. Check fibre content on each result." }
  ];

  /* Evidence for the fabric rules. Every citation was checked against the
   * source on 2026-11-19 (see RESEARCH_NOTES.md). */
  const REFS = [
    { claim: "After a spinning class, polyester shirts smelled significantly stronger and less pleasant than cotton ones. Odour-causing Micrococcus bacteria grew selectively on polyester.",
      cite: "Callewaert C. et al. (2014). Microbial odor profile of polyester and cotton clothes after a fitness session. Applied and Environmental Microbiology 80(21):6611–6619. doi:10.1128/AEM.01422-14",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4249026/" },
    { claim: "One 6 kg wash released about 496,000 fibres from polyester and 729,000 from acrylic, against 138,000 from a polyester-cotton blend.",
      cite: "Napper I.E. & Thompson R.C. (2016). Release of synthetic microplastic plastic fibres from domestic washing machines. Marine Pollution Bulletin 112:39–45. doi:10.1016/j.marpolbul.2016.09.025",
      url: "https://doi.org/10.1016/j.marpolbul.2016.09.025" },
    { claim: "Washing synthetic clothes released 124–308 mg of microfibres per kg of fabric, roughly 640,000 to 1,500,000 fibres.",
      cite: "De Falco F. et al. (2019). The contribution of washing processes of synthetic clothes to microplastic pollution. Scientific Reports 9:6633. doi:10.1038/s41598-019-43023-x",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6488573/" },
    { claim: "\"Bamboo\" clothing is usually rayon made with harsh chemicals. In 2022 the US FTC fined Kohl's $2.5 million and Walmart $3 million for selling rayon as bamboo.",
      cite: "US Federal Trade Commission press release, 8 April 2022.",
      url: "https://www.ftc.gov/news-events/news/press-releases/2022/04/ftc-uses-penalty-offense-authority-seek-largest-ever-civil-penalty-bogus-bamboo-marketing-kohls" },
    { claim: "A GOTS \"organic\" label means at least 95% certified organic fibre; \"made with organic materials\" means at least 70%. OEKO-TEX Standard 100 is a harmful-substance test, not an organic label.",
      cite: "Global Organic Textile Standard, Key Features; OEKO-TEX Standard 100.",
      url: "https://global-standards.org/our-standards/gots/key-features" },
    { claim: "Cotton knits are especially prone to shrinking. One wash-and-dry cycle can remove around 90% of the shrinkage, most of it in the tumble dryer. Wash new cotton once before judging the length, or line-dry it.",
      cite: "Cotton Incorporated (2004). A Guide to Improved Shrinkage Performance of Cotton Fabrics, ISP 1009 (industry technical bulletin).",
      url: "https://www.cottoninc.com/wp-content/uploads/2017/12/ISP-1009-Guide-to-Improved-Shrinkage-Performance-of-Cotton-Fabrics.pdf" }
  ];

  return { COLORS, COLOR_FAMILIES, FABRICS, CATEGORIES, VIBES, ITEMS, STORES, REFS };
})();
