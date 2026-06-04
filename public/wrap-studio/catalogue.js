/* =========================================================================
   Wrap Visualisation Studio — Colour & Material Catalogue
   Avery Dennison · Hexis · STEK PPF
   Representative data set (~110 films) with realistic series / codes / specs.
   ========================================================================= */
(function () {
  // finish keys: gloss | satin | matte | chrome | shift | ppf-clear | ppf-matte
  // tier:        standard | premium | specialist
  // hex2 used by chrome (band) and shift (flip colour)

  const C = [];
  let n = 0;
  function add(o) { o.id = (o.brand[0] + '-' + (++n)).toLowerCase() + '-' + slug(o.name); C.push(o); }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  /* ---------------------------------------------------------------- AVERY */
  // Supreme Wrapping Film — Gloss
  [
    ['Gloss Black',            '#0c0c0e'], ['Gloss White',           '#f3f4f6'],
    ['Gloss Carbon Grey',      '#3a3d42'], ['Gloss Storm Grey',      '#6b6f76'],
    ['Gloss Dark Red',         '#5a1118'], ['Gloss Cardinal Red',    '#9c1622'],
    ['Gloss Hot Pink',         '#d63a8f'], ['Gloss Burgundy',        '#3f1220'],
    ['Gloss Sea Storm',        '#2f5752'], ['Gloss Dark Green',      '#143a2b'],
    ['Gloss Light Green',      '#3f8f55'], ['Gloss Smoky Blue',      '#46606f'],
    ['Gloss Intense Blue',     '#16357a'], ['Gloss Boat Blue',       '#0e4d8c'],
    ['Gloss Yellow',           '#f2c413'], ['Gloss Bright Orange',   '#ef6a12'],
    ['Gloss Khaki Green',      '#5d5a32'], ['Gloss Metallic Brown',  '#4a3525'],
  ].forEach(([name, hex]) => add({ brand: 'Avery Dennison', series: 'Supreme Wrapping Film', finish: 'gloss', name, hex, tier: 'standard' }));

  // Satin / Metallic
  [
    ['Satin Black',            '#16171a'], ['Satin White',           '#e9eaec'],
    ['Satin Pearl White',      '#e6e8ea'], ['Satin Battleship Grey', '#54585f'],
    ['Satin Metallic Gunmetal','#3c4148'], ['Satin Dark Grey',       '#33363b'],
    ['Satin Metallic Charcoal','#2b2e33'], ['Satin Metallic Frosty Blue','#7d97ac'],
    ['Satin Ocean Shimmer',    '#26566b'], ['Satin Apple Green',     '#2f7d3e'],
    ['Satin Metallic Gold',    '#9c7d3a'], ['Satin Bronze',          '#6b4a2a'],
    ['Satin Caramel Luxe',     '#8a5a32'], ['Satin Metallic Rose',   '#b06a72'],
  ].forEach(([name, hex]) => add({ brand: 'Avery Dennison', series: 'Supreme Wrapping Film', finish: 'satin', name, hex, tier: 'premium' }));

  // Matte
  [
    ['Matte Black',            '#1b1c1e'], ['Matte White',           '#dfe0e2'],
    ['Matte Charcoal Metallic','#33363a'], ['Matte Grey',            '#5a5d62'],
    ['Matte Khaki Green',      '#5a5733'], ['Matte Metallic Green',  '#314536'],
    ['Matte Midnight Sand',    '#7a6f57'], ['Matte Brown',           '#3f2f23'],
    ['Matte Indigo',           '#2a2f55'], ['Matte Red',             '#7c1d22'],
  ].forEach(([name, hex]) => add({ brand: 'Avery Dennison', series: 'Supreme Wrapping Film', finish: 'matte', name, hex, tier: 'premium', proTip: 'Matte films show every prep imperfection. We decontaminate and inspect before a single panel is laid.' }));

  // Diamond / Carbon — treat sparkle as gloss-tier specialist
  [
    ['Gloss Metallic Diamond Black', '#1a1c22'], ['Gloss Metallic Diamond Silver', '#b9bdc4'],
    ['Gloss Metallic Diamond Blue',  '#2a3f8c'], ['Gloss Metallic Diamond Red',   '#8c1f28'],
  ].forEach(([name, hex]) => add({ brand: 'Avery Dennison', series: 'SWF Diamond', finish: 'gloss', name, hex, tier: 'specialist' }));

  // ColorFlow — colour-shift
  [
    ['ColorFlow Rushing Riptide',   '#1b4f6b', '#5a2f8c'],
    ['ColorFlow Fresh Spring',      '#c9b25a', '#9aa6a0'],
    ['ColorFlow Lightning Ridge',   '#8a9bb0', '#2a3f6b'],
    ['ColorFlow Roaring Thunder',   '#1d3a66', '#101019'],
    ['ColorFlow Urban Jungle',      '#2f6b3a', '#6b5a2a'],
    ['ColorFlow Rising Sun',        '#b2402a', '#c98a2a'],
    ['ColorFlow Cosmic Pearl',      '#6b3a8c', '#2a5a8c'],
  ].forEach(([name, hex, hex2]) => add({ brand: 'Avery Dennison', series: 'SWF ColorFlow', finish: 'shift', name, hex, hex2, tier: 'specialist', proTip: 'Colour-shift reads differently from every angle. Bring the car to the studio to see the full flip before you commit.' }));

  /* ----------------------------------------------------------------- HEXIS */
  [
    ['Gloss Black HX20000',      '#0d0d0f'], ['Gloss White HX20001',  '#f4f5f7'],
    ['Gloss Anthracite',         '#33373c'], ['Gloss Pearl Grey',     '#7c8088'],
    ['Gloss Racing Red',         '#a4121d'], ['Gloss Wine Red',       '#4a1320'],
    ['Gloss Tropical Green',     '#0f6b4a'], ['Gloss British Racing',  '#163528'],
    ['Gloss Klein Blue',         '#143b8c'], ['Gloss Sky Blue',       '#3a86c4'],
    ['Gloss Sunflower',          '#f0bc14'], ['Gloss Pure Orange',    '#e85d12'],
    ['Gloss Lavender',           '#7b6bb0'], ['Gloss Turquoise',      '#1f8a8a'],
  ].forEach(([name, hex]) => add({ brand: 'Hexis', series: 'Skintac HX20000', finish: 'gloss', name, hex, tier: 'standard' }));

  [
    ['Satin Black HX20889',      '#17181b'], ['Satin Pearl White',    '#e7e9eb'],
    ['Satin Aluminium',          '#8a8e94'], ['Satin Dark Grey',      '#3a3d42'],
    ['Satin Metal Storm',        '#4a4f57'], ['Satin Petrol Blue',    '#1f4a5a'],
    ['Satin Green Viper',        '#2f7a3a'], ['Satin Bronze Age',     '#6e4d2a'],
    ['Satin Copper',             '#8a4a2a'], ['Satin Plum',           '#4a2a45'],
  ].forEach(([name, hex]) => add({ brand: 'Hexis', series: 'Skintac HX20000', finish: 'satin', name, hex, tier: 'premium' }));

  [
    ['Matte Black HX20889B',     '#1c1d1f'], ['Matte White',          '#dcdde0'],
    ['Matte Graphite',           '#3c3f44'], ['Matte Concrete',       '#6e7177'],
    ['Matte Army Green',         '#4a4d2f'], ['Matte Forest',         '#27402f'],
    ['Matte Aubergine',          '#2e2236'], ['Matte Burnt Orange',   '#9c4a1d'],
  ].forEach(([name, hex]) => add({ brand: 'Hexis', series: 'Skintac HX20000', finish: 'matte', name, hex, tier: 'premium', proTip: 'Hexis matte conforms beautifully but marks easily during handling. We bag the panels until install.' }));

  // Super Chrome
  [
    ['Super Chrome Silver',  '#cfd2d6', '#7c8086'],
    ['Super Chrome Gold',    '#cBa14a', '#7a5e22'],
    ['Super Chrome Blue',    '#5a7fb0', '#1f3a6b'],
    ['Super Chrome Red',     '#b04a52', '#5a1820'],
    ['Super Chrome Black',   '#5a5e64', '#17181b'],
  ].forEach(([name, hex, hex2]) => add({ brand: 'Hexis', series: 'Super Chrome', finish: 'chrome', name, hex, hex2, tier: 'specialist', proTip: 'Chrome needs a primer on the edges and is unforgiving on complex curves. Full-car chrome is a specialist job — we quote it honestly.' }));

  // Colour-shift
  [
    ['ChromaFlair Midnight Purple', '#2a1d4a', '#4a2a2a'],
    ['ChromaFlair Emerald Gold',    '#1f5a3a', '#9a8a2a'],
    ['ChromaFlair Deep Ocean',      '#143a6b', '#2a6b6b'],
  ].forEach(([name, hex, hex2]) => add({ brand: 'Hexis', series: 'ChromaFlair', finish: 'shift', name, hex, hex2, tier: 'specialist' }));

  /* ------------------------------------------------------------------ STEK */
  // PPF Clear (gloss)
  [
    ['DYNOshield Gloss',        '#cdd4dc'], ['DYNOshield Self-Heal',  '#d2d8df'],
  ].forEach(([name, hex]) => add({ brand: 'STEK', series: 'DYNOshield PPF', finish: 'ppf-clear', name, hex, tier: 'premium', proTip: 'PPF goes over corrected paint. We measure paint thickness and decontaminate first — film locks in whatever is underneath.' }));

  // PPF Matte
  [
    ['DYNOmatte Frost',         '#c6ccd2'], ['DYNOmatte Satin',       '#cacfd5'],
  ].forEach(([name, hex]) => add({ brand: 'STEK', series: 'DYNOmatte PPF', finish: 'ppf-matte', name, hex, tier: 'premium', proTip: 'Matte PPF flattens gloss paint to a satin sheen — and it is permanent-feel until removed. We show you a sample panel first.' }));

  // DYNOblack (smoked gloss)
  [
    ['DYNOblack Gloss', '#101216'], ['DYNOblack Matte', '#16181c'],
  ].forEach(([name, hex]) => add({ brand: 'STEK', series: 'DYNOblack PPF', finish: name.includes('Matte') ? 'ppf-matte' : 'ppf-clear', name, hex, tier: 'specialist' }));

  // STEK Color PPF (Fusion) — coloured protection films, gloss + satin
  [
    ['Fusion Gloss Black',   '#0d0e11', 'gloss'], ['Fusion Gloss White',  '#f1f2f4', 'gloss'],
    ['Fusion Gloss Red',     '#971520', 'gloss'], ['Fusion Gloss Blue',   '#163a86', 'gloss'],
    ['Fusion Gloss Green',   '#155a3a', 'gloss'], ['Fusion Gloss Grey',   '#5a5e64', 'gloss'],
    ['Fusion Satin Black',   '#18191c', 'satin'], ['Fusion Satin Grey',   '#4a4e54', 'satin'],
    ['Fusion Satin Blue',    '#274a6b', 'satin'], ['Fusion Satin Green',  '#2f5a3a', 'satin'],
  ].forEach(([name, hex, fin]) => add({ brand: 'STEK', series: 'Fusion Color PPF', finish: fin, name, hex, tier: 'specialist', proTip: 'Colour PPF is protection and colour change in one film — thicker and more durable than vinyl, priced to match.' }));

  /* ----------------------------------------------------------------- specs */
  // Attach finish-driven specs + a friendly tier label.
  const SPEC = {
    'gloss':     { thickness: '70 µm', conform: 'High', warranty: '5–7 yr' },
    'satin':     { thickness: '75 µm', conform: 'High', warranty: '5–7 yr' },
    'matte':     { thickness: '80 µm', conform: 'Medium', warranty: '5–7 yr' },
    'chrome':    { thickness: '95 µm', conform: 'Low', warranty: '2–3 yr' },
    'shift':     { thickness: '90 µm', conform: 'Medium', warranty: '3–5 yr' },
    'ppf-clear': { thickness: '200 µm', conform: 'High', warranty: '10 yr' },
    'ppf-matte': { thickness: '200 µm', conform: 'High', warranty: '10 yr' },
  };
  C.forEach((c, i) => {
    const s = SPEC[c.finish];
    c.thickness = s.thickness; c.conform = s.conform; c.warranty = s.warranty;
    // believable per-brand product code
    const bp = { 'Avery Dennison': 'AV', 'Hexis': 'HX', 'STEK': 'ST' }[c.brand];
    const fp = { gloss: 'G', satin: 'S', matte: 'M', chrome: 'CR', shift: 'CF', 'ppf-clear': 'PC', 'ppf-matte': 'PM' }[c.finish];
    c.code = bp + fp + String(1000 + i * 7).slice(-4);
  });

  window.FINISHES = [
    { key: 'gloss',     label: 'Gloss' },
    { key: 'satin',     label: 'Satin' },
    { key: 'matte',     label: 'Matte' },
    { key: 'chrome',    label: 'Chrome' },
    { key: 'shift',     label: 'Colour-shift' },
    { key: 'ppf-clear', label: 'PPF Clear' },
    { key: 'ppf-matte', label: 'PPF Matte' },
  ];
  window.BRANDS = ['Avery Dennison', 'Hexis', 'STEK'];
  window.TIER_LABEL = {
    standard:   { name: 'Standard',   note: 'Solid colours, gloss & satin' },
    premium:    { name: 'Premium',    note: 'Metallics, matte, satin pearls' },
    specialist: { name: 'Specialist', note: 'Chrome, colour-shift, colour PPF' },
  };
  window.WRAP_CATALOGUE = C;
})();
