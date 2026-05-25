import Script from 'next/script';

export const metadata = {
  title: { absolute: 'Matthews / Clark — Cape Town' },
  description: "Premium PPF, ceramic, wraps and detailing in Cape Town. Matthews / Clark, partnered with Izimoto — Johannesburg's most respected automotive boutique, now in Cape Town. Tell us about your car.",
  alternates: { canonical: 'https://www.matthewsandclark.co.za/mc-site' },
  openGraph: {
    title: 'Matthews / Clark — Cape Town',
    description: "Premium PPF, ceramic, wraps and detailing in Cape Town. Matthews / Clark, partnered with Izimoto — Johannesburg's most respected automotive boutique, now in Cape Town. Tell us about your car.",
    url: 'https://www.matthewsandclark.co.za/mc-site',
  },
  twitter: {
    title: 'Matthews / Clark — Cape Town',
    description: "Premium PPF, ceramic, wraps and detailing in Cape Town. Matthews / Clark, partnered with Izimoto — Johannesburg's most respected automotive boutique, now in Cape Town. Tell us about your car.",
  },
};

const pageCSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#0D0D0D;color:#fff;-webkit-font-smoothing:antialiased}
  body{font-family:'Inter Tight',system-ui,sans-serif;font-size:16px;line-height:1.55;min-width:320px;overflow-x:hidden}
  a{color:inherit;text-decoration:none}
  button{font:inherit;cursor:pointer;border:0;background:none;color:inherit}
  img,video{display:block;max-width:100%}
  ::selection{background:#1F4FFF;color:#fff}

  :root{
    --black:#0D0D0D;
    --grey-dark:#1A1A1A;
    --grey-mid:#444444;
    --grey-light:#888888;
    --border:#2A2A2A;
    --accent:#1F4FFF;
    --accent-deep:#1638CC;
    --content-max:1280px;
    --gutter:48px;
    --nav-h:64px;
    --display:'Anton',Impact,sans-serif;
    --headline:'Archivo',sans-serif;
    --body:'Inter Tight',sans-serif;
    --mono:'JetBrains Mono',monospace;
  }
  .container{max-width:var(--content-max);margin:0 auto;padding:0 var(--gutter)}

  /* ─── DESKTOP / MOBILE SECTION VISIBILITY ─── */
  .desktop-hero,.desktop-tagline,.desktop-log,.desktop-services,.desktop-brand,.desktop-event,.desktop-final-cta,.desktop-book,.desktop-footer{display:block}
  .mobile-hero,.mobile-below{display:none}

  /* ─── HEADER (floating) ─── */
  .nav{
    position:fixed;top:20px;left:24px;right:24px;z-index:1000;height:60px;
    display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px;
    padding:0 8px 0 24px;
    background:rgba(13,13,13,0.55);
    backdrop-filter:blur(22px) saturate(140%);-webkit-backdrop-filter:blur(22px) saturate(140%);
    border:1px solid rgba(255,255,255,.08);
    border-radius:999px;
    box-shadow:0 10px 36px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.02) inset;
    transition:background .3s ease, border-color .3s ease, top .3s ease, box-shadow .3s ease;
  }
  .nav.scrolled{
    background:rgba(13,13,13,0.78);
    border-color:rgba(255,255,255,.10);
    top:14px;
    box-shadow:0 14px 44px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.03) inset;
  }
  .nav .brand{
    display:flex;align-items:baseline;gap:14px;
    justify-self:start;padding-left:8px;color:#fff;line-height:1;
  }
  .nav .brand .wm{
    font-family:var(--display);font-size:24px;
    letter-spacing:.10em;text-transform:uppercase;color:#fff;
    display:inline-block;
  }
  .nav .brand .wm .slash{color:var(--accent);font-weight:500;margin:0 -2px;display:inline-block;transform:translateY(1px);}
  .nav .brand .mono{
    font-family:var(--mono);font-size:10px;letter-spacing:.22em;
    color:rgba(255,255,255,.45);text-transform:uppercase;font-weight:400;
    border-left:1px solid rgba(255,255,255,.16);padding-left:12px;
  }
  .nav .links{display:flex;align-items:center;gap:28px;justify-self:center;}
  .nav .links a{
    font-family:var(--mono);font-size:11px;font-weight:500;
    color:rgba(255,255,255,.85);letter-spacing:.18em;text-transform:uppercase;
    position:relative;padding:8px 0;transition:color .15s ease;
  }
  .nav .links a:hover{color:#fff}
  .nav .links a::after{
    content:'';position:absolute;left:0;right:0;bottom:2px;height:1px;
    background:var(--accent);transform:scaleX(0);transform-origin:left;
    transition:transform .25s cubic-bezier(.2,.8,.2,1);
  }
  .nav .links a:hover::after{transform:scaleX(1)}
  .nav .links .has-caret span{
    display:inline-block;margin-left:6px;font-size:8px;vertical-align:middle;
    color:rgba(255,255,255,.4);transform:translateY(-1px);
  }
  .nav .right{display:flex;align-items:center;gap:14px;justify-self:end;}
  .btn-accent{
    display:inline-flex;align-items:center;justify-content:center;gap:8px;
    height:44px;padding:0 18px 0 22px;border-radius:999px;
    background:var(--accent);color:#fff;
    font-family:var(--headline);font-weight:700;font-size:13px;letter-spacing:.02em;
    transition:background .15s ease, transform .1s ease;
  }
  .btn-accent:hover{background:#4A78FF}
  .btn-accent:active{transform:scale(.985);background:var(--accent-deep)}
  .btn-accent svg{transition:transform .2s ease}
  .btn-accent:hover svg{transform:translateX(2px)}
  @keyframes slotPulse{0%,100%{opacity:1}50%{opacity:.4}}

  /* ─── SECTION 1: HERO ─── */
  .hero{position:relative;width:100%;height:100vh;min-height:780px;background:var(--black);}
  .hero-grid{
    display:grid;grid-template-columns:38% 1fr;grid-template-rows:55% 45%;
    grid-template-areas:"v1 brand""v1 strip";
    gap:3px;width:100%;height:100%;background:var(--black);
  }
  .tile{position:relative;overflow:hidden;background:#0a0a0a;display:block;}
  .tile video, .tile .poster{
    position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
    transition:transform .35s cubic-bezier(.2,.8,.2,1);
  }
  .tile:hover video{transform:scale(1.015)}
  .tile .poster{
    background:radial-gradient(ellipse at 60% 35%, rgba(31,79,255,.18), transparent 60%),linear-gradient(160deg, #1a1a1a 0%, #060606 100%);
    display:flex;align-items:flex-end;padding:18px;
    font-family:var(--mono);font-size:9px;letter-spacing:.22em;
    text-transform:uppercase;color:rgba(255,255,255,.4);
  }
  .tile.t1{grid-area:v1}
  .strip{grid-area:strip;display:flex;gap:3px;min-height:0}
  .strip .tile{flex:1;min-width:0}
  .tile-caption{
    position:absolute;left:0;right:0;bottom:0;
    padding:18px;
    background:linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.55) 50%, transparent 100%);
    opacity:0;transition:opacity .25s ease;pointer-events:none;z-index:5;
  }
  .tile:hover .tile-caption,.tile:focus-within .tile-caption{opacity:1}
  .tile-caption .stag{display:inline-block;font-family:var(--mono);font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.7);margin-bottom:6px;}
  .tile-caption .desc{font-family:var(--headline);font-weight:700;font-size:14px;line-height:1.25;letter-spacing:-.005em;color:#fff;}
  .tile-caption .desc .arr{color:var(--accent);font-family:var(--mono);font-weight:400;margin-left:4px}
  .tile-id{
    position:absolute;top:14px;left:14px;z-index:6;
    font-family:var(--mono);font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.7);
    padding:5px 8px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.10);
    backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  }
  .tile-id b{color:var(--accent);font-weight:500}
  .tile.t1::after{
    content:'';position:absolute;left:0;right:0;bottom:0;height:50%;z-index:4;
    background:linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 100%);pointer-events:none;
  }
  .featured-cap{
    position:absolute;left:0;right:0;bottom:0;z-index:6;padding:28px 28px 32px;
    display:flex;flex-direction:column;gap:6px;
  }
  .featured-cap .eyebrow{
    display:inline-flex;align-items:center;gap:8px;align-self:flex-start;
    font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.85);
    padding:5px 9px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.16);
    backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);margin-bottom:14px;
  }
  .featured-cap .eyebrow .pulse{width:6px;height:6px;border-radius:999px;background:var(--accent);animation:slotPulse 2.2s ease-in-out infinite;}
  .featured-cap .stag{font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.65);}
  .featured-cap .desc{font-family:var(--headline);font-weight:700;font-size:20px;line-height:1.2;letter-spacing:-.01em;color:#fff;text-wrap:balance;max-width:24ch;}
  .featured-cap .meta{margin-top:8px;font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);}
  .featured-cap .meta b{color:#fff;font-weight:500}

  /* ─── BRAND BAY — top-right ─── */
  .brand-bay{
    grid-area:brand;background:#0D0D0D;padding:120px 64px 48px;
    display:flex;flex-direction:column;justify-content:space-between;border-bottom:1px solid #1f1f1f;
  }
  .brand-bay h1{
    font-family:var(--display);font-size:clamp(60px, 6.5vw, 104px);line-height:.9;letter-spacing:0;
    text-transform:uppercase;color:#fff;text-wrap:balance;margin-top:0;
  }
  .brand-bay h1 .blue{color:var(--accent)}
  .brand-bay .row-bot{
    display:flex;align-items:center;justify-content:space-between;gap:24px;
    margin-top:auto;padding-top:36px;border-top:1px solid #1f1f1f;
  }
  .brand-bay .cta-pair{display:flex;align-items:center;gap:16px}
  .brand-bay .cta-primary{
    display:inline-flex;align-items:center;justify-content:center;gap:12px;
    height:52px;padding:0 24px;border-radius:4px;background:var(--accent);color:#fff;
    font-family:var(--headline);font-weight:700;font-size:15px;letter-spacing:.01em;
    transition:background .15s ease, transform .1s ease;
  }
  .brand-bay .cta-primary:hover{background:#4A78FF}
  .brand-bay .cta-primary:active{transform:scale(.985);background:var(--accent-deep)}
  .brand-bay .cta-primary .arr{display:grid;place-items:center;width:28px;height:28px;border-radius:999px;background:rgba(255,255,255,.18);}
  .brand-bay .cta-ghost{
    font-family:var(--headline);font-weight:600;font-size:14px;
    color:rgba(255,255,255,.75);letter-spacing:.005em;
    display:inline-flex;align-items:center;gap:8px;
    border-bottom:1px solid rgba(255,255,255,.25);padding-bottom:3px;
    transition:color .2s ease, border-color .2s ease;
  }
  .brand-bay .cta-ghost:hover{color:#fff;border-color:#fff}
  .brand-bay .scroll-cue{
    display:inline-flex;align-items:center;gap:10px;
    font-family:var(--mono);font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.5);
  }
  .brand-bay .scroll-cue .line{width:30px;height:1px;background:rgba(255,255,255,.5);}

  /* ─── SECTION 2: TAGLINE BREAK ─── */
  .tagline{background:#fff;color:var(--black);height:240px;overflow:hidden;display:flex;align-items:center;border-bottom:1px solid rgba(0,0,0,.06);}
  .ticker{display:flex;gap:80px;animation:tick 38s linear infinite;white-space:nowrap;will-change:transform;}
  .ticker .t{font-family:var(--display);font-size:88px;line-height:1;letter-spacing:.005em;text-transform:uppercase;color:var(--black);display:inline-flex;align-items:center;gap:80px;}
  .ticker .t .slash{color:var(--accent);font-weight:400;margin:0 12px}
  @keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}

  /* ─── SECTION 3: THE LOG ─── */
  .log-sec{padding:120px 0 96px;background:var(--black);position:relative}
  .log-sec .container{position:relative}
  .sec-h{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:56px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,.08);}
  .sec-h .label{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55);display:flex;align-items:center;gap:18px;}
  .sec-h .label .num{color:var(--accent);font-weight:500}
  .sec-h .label .div{display:inline-block;width:24px;height:1px;background:rgba(255,255,255,.2);}
  .sec-h .label .sub{color:rgba(255,255,255,.4)}
  .sec-h .see-all{font-family:var(--headline);font-weight:600;font-size:13px;color:var(--accent);display:inline-flex;align-items:center;gap:8px;border-bottom:1px solid transparent;padding-bottom:2px;letter-spacing:.04em;transition:border-color .2s ease;}
  .sec-h .see-all:hover{border-bottom-color:var(--accent)}
  .log-featured{display:grid;grid-template-columns:1.55fr 1fr;gap:40px;margin-bottom:64px;align-items:stretch;}
  .log-featured .img{position:relative;aspect-ratio:4/3;background:var(--grey-dark);overflow:hidden;}
  .log-featured .img::before{content:'';position:absolute;inset:0;background:rgba(0,0,0,.35);z-index:1;}
  .log-featured .img .ix{z-index:2}
  .log-featured .img .badge{z-index:2}
  .log-featured .img .ix{position:absolute;right:32px;top:24px;font-family:var(--display);font-size:160px;line-height:.85;color:rgba(255,255,255,.04);letter-spacing:.005em;}
  .log-featured .img .ph{position:absolute;left:20px;top:18px;font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.4);padding:5px 8px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);}
  .log-featured .img .badge{position:absolute;left:20px;bottom:20px;display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#fff;padding:7px 11px;background:rgba(31,79,255,.85);border-radius:999px;}
  .log-featured .img .badge::before{content:'';display:inline-block;width:5px;height:5px;border-radius:999px;background:#fff;}
  .log-featured .body{display:flex;flex-direction:column;justify-content:space-between;padding:8px 0 0;}
  .log-featured .meta{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55);display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-bottom:24px;}
  .log-featured .meta .b{color:#fff;font-weight:500}
  .log-featured .meta .dot{width:3px;height:3px;border-radius:999px;background:rgba(255,255,255,.3)}
  .log-featured h3{font-family:var(--display);font-size:64px;line-height:.95;letter-spacing:0;text-transform:uppercase;color:#fff;text-wrap:balance;}
  .log-featured h3 .blue{color:var(--accent)}
  .log-featured .lede{margin-top:20px;font-family:var(--body);font-size:17px;line-height:1.55;color:rgba(255,255,255,.7);max-width:36ch;}
  .log-featured .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:24px}
  .log-featured .tags span{display:inline-flex;align-items:center;font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.75);padding:6px 12px;border:1px solid rgba(255,255,255,.18);border-radius:999px;}
  .log-featured .read{margin-top:32px;font-family:var(--headline);font-weight:700;font-size:15px;color:var(--accent);display:inline-flex;align-items:center;gap:10px;border-bottom:1.5px solid var(--accent);padding-bottom:4px;align-self:flex-start;transition:gap .2s ease;}
  .log-featured:hover .read{gap:14px}
  .log-list{display:flex;flex-direction:column;border-top:1px solid rgba(255,255,255,.08);}
  .log-row{display:grid;grid-template-columns:60px 100px 1fr auto 28px;gap:24px;align-items:center;padding:24px 0;border-bottom:1px solid rgba(255,255,255,.08);transition:padding .2s ease;}
  .log-row:hover{padding-left:8px;padding-right:8px;background:rgba(255,255,255,.015)}
  .log-row .ix{font-family:var(--mono);font-size:11px;letter-spacing:.22em;color:var(--accent);font-weight:500;}
  .log-row .when{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5);}
  .log-row .title-block{display:flex;flex-direction:column;gap:6px;min-width:0}
  .log-row h4{font-family:var(--headline);font-weight:700;font-size:22px;line-height:1.15;letter-spacing:-.01em;color:#fff;}
  .log-row .who{font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.4);}
  .log-row .who b{color:#fff;font-weight:500}
  .log-row .tags{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
  .log-row .tags span{font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.65);padding:4px 10px;border:1px solid rgba(255,255,255,.14);border-radius:999px;}
  .log-row .arrow{width:36px;height:36px;border-radius:999px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.16);color:rgba(255,255,255,.7);transition:background .2s ease, color .2s ease, border-color .2s ease, transform .2s ease;}
  .log-row:hover .arrow{background:var(--accent);color:#fff;border-color:var(--accent);transform:translateX(4px)}

  /* ─── SECTION 4: SERVICES STRIP ─── */
  .services{background:var(--black);padding:0 0 0;border-top:1px solid rgba(255,255,255,.04);}
  .svc-grid{display:grid;grid-template-columns:repeat(8, 1fr);gap:0;border-top:1px solid var(--border);}
  .svc{position:relative;display:flex;flex-direction:column;aspect-ratio:1/1.1;border-right:1px solid var(--border);padding:24px;transition:background .2s ease, border-color .2s ease;}
  .svc:last-child{border-right:0}
  .svc:hover{background:var(--grey-dark)}
  .svc .ix{font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.35);}
  .svc .name{margin-top:auto;font-family:var(--display);font-size:24px;line-height:1;letter-spacing:.005em;text-transform:uppercase;color:#fff;}
  .svc .lbl{font-family:var(--body);font-size:13px;line-height:1.4;color:var(--grey-light);margin-top:6px;}
  .svc .arr{position:absolute;right:18px;bottom:18px;font-family:var(--mono);font-size:14px;color:var(--accent);opacity:.7;transition:opacity .2s ease, transform .2s ease;}
  .svc:hover .arr{opacity:1;transform:translateX(2px)}

  /* ─── SECTION 5: BRAND + FOUNDERS ─── */
  .brand-sec{background:#fff;color:var(--black);display:grid;grid-template-columns:55% 45%;align-items:stretch;border-top:1px solid var(--border);}
  .brand-sec .copy{padding:140px var(--gutter) 140px max(var(--gutter), calc((100vw - var(--content-max)) / 2 + var(--gutter)));display:flex;flex-direction:column;justify-content:center;max-width:880px;}
  .brand-sec .label{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#888;margin-bottom:32px;}
  .brand-sec .label .num{color:var(--accent);margin-right:8px;font-weight:500}
  .brand-sec h2{font-family:var(--display);font-size:96px;line-height:.9;letter-spacing:0;text-transform:uppercase;color:var(--black);}
  .brand-sec h2 .slash{color:var(--accent);font-weight:400}
  .brand-sec h2 .blue{color:var(--accent)}
  .brand-sec p{font-family:var(--body);font-size:18px;line-height:1.55;color:#333;max-width:46ch;margin-top:32px;}
  .brand-sec p + p{margin-top:16px}
  .brand-sec .link{margin-top:36px;align-self:flex-start;font-family:var(--headline);font-weight:700;font-size:17px;color:var(--accent);display:inline-flex;align-items:center;gap:10px;border-bottom:1.5px solid var(--accent);padding-bottom:4px;}
  .brand-sec .photo{position:relative;background:#1a1a1a;overflow:hidden;min-height:760px;}
  .brand-sec .photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;filter:contrast(1.03) saturate(.98);}
  .brand-sec .photo .stamp{position:absolute;left:24px;top:24px;font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#fff;padding:6px 10px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}
  .brand-sec .photo .credit{position:absolute;right:24px;bottom:24px;font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.85);text-align:right;line-height:1.7;padding:8px 12px;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}

  /* ─── SECTION 6: NEXT EVENT ─── */
  .event-sec{position:relative;background:var(--black);padding:140px var(--gutter) 160px;overflow:hidden;border-top:1px solid rgba(255,255,255,.04);}
  .event-sec::before{content:'';position:absolute;left:50%;top:55%;transform:translate(-50%,-50%);width:1400px;height:1400px;border-radius:999px;background:radial-gradient(circle, rgba(31,79,255,.10) 0%, transparent 55%);pointer-events:none;}
  .event-sec::after{content:'';position:absolute;inset:0;background-image:linear-gradient(to right, rgba(255,255,255,.03) 1px, transparent 1px);background-size:calc(100% / 12) 100%;background-position:0 0;pointer-events:none;mask:linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent);}
  .event-wrap{position:relative;z-index:2;max-width:var(--content-max);margin:0 auto;}
  .event-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:80px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,.1);}
  .event-top .ix{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55);display:flex;align-items:center;gap:12px;}
  .event-top .ix .num{color:var(--accent);font-weight:500}
  .event-top .ix .div{display:inline-block;width:20px;height:1px;background:rgba(255,255,255,.2)}
  .event-top .ix .sub{color:rgba(255,255,255,.4)}
  .event-top .live{display:inline-flex;align-items:center;gap:10px;font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.85);padding:7px 14px;border:1px solid rgba(31,79,255,.4);border-radius:999px;background:rgba(31,79,255,.08);}
  .event-top .live .dot{width:6px;height:6px;border-radius:999px;background:var(--accent);animation:slotPulse 2.2s ease-in-out infinite;}
  .event-grid{display:flex;flex-direction:column;align-items:center;text-align:center;max-width:1100px;margin:0 auto;}
  .lockup{display:flex;align-items:center;justify-content:center;gap:56px;width:100%;}
  .lockup .logo{display:block;height:140px;width:auto;flex-shrink:0;filter:drop-shadow(0 8px 30px rgba(0,0,0,.45));}
  .lockup-x{font-family:var(--display);font-size:80px;line-height:1;color:rgba(255,255,255,.25);margin:0 8px;user-select:none;}
  .lockup .logo.izi{height:80px;}
  .event-date{font-family:var(--display);font-size:clamp(120px, 13vw, 200px);line-height:.92;letter-spacing:-.005em;text-transform:uppercase;color:#fff;margin-top:56px;position:relative;}
  .event-date .blue{color:var(--accent);position:relative;display:inline-block}
  .event-date .blue .scribble{position:absolute;left:-8%;right:-8%;bottom:8%;height:14px;background:var(--accent);z-index:-1;opacity:.25;transform:skew(-12deg);}
  .event-title{font-family:var(--display);font-size:clamp(56px, 6vw, 88px);line-height:.95;letter-spacing:0;text-transform:uppercase;color:#fff;margin-top:16px;text-wrap:balance;}
  .event-title .blue{color:var(--accent)}
  .event-lede{margin-top:32px;max-width:58ch;font-family:var(--body);font-size:18px;line-height:1.6;color:rgba(255,255,255,.72);text-wrap:balance;}
  .event-details{display:grid;grid-template-columns:repeat(4, 1fr);gap:0;margin-top:64px;width:100%;max-width:980px;border-top:1px dashed rgba(255,255,255,.18);border-bottom:1px dashed rgba(255,255,255,.18);}
  .event-details .cell{padding:28px 20px;display:flex;flex-direction:column;gap:10px;text-align:center;border-right:1px dashed rgba(255,255,255,.10);align-items:center;}
  .event-details .cell:last-child{border-right:0}
  .event-details .cell .k{font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.45);}
  .event-details .cell .v{font-family:var(--headline);font-weight:700;font-size:16px;color:#fff;line-height:1.35;letter-spacing:-.005em;}
  .event-details .cell .v .sub{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.4);font-weight:400;margin-top:4px;}
  .event-actions{display:flex;align-items:center;gap:24px;margin-top:56px;flex-wrap:wrap;justify-content:center;}
  .btn-rsvp{display:inline-flex;align-items:center;gap:12px;height:56px;padding:0 26px;border-radius:4px;background:var(--accent);color:#fff;font-family:var(--headline);font-weight:700;font-size:15px;letter-spacing:.01em;transition:background .15s ease, transform .1s ease;}
  .btn-rsvp:hover{background:#4A78FF}
  .btn-rsvp:active{transform:scale(.985);background:var(--accent-deep)}
  .btn-rsvp .arr{display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:rgba(255,255,255,.18);}
  .link-ghost{font-family:var(--headline);font-weight:600;font-size:14px;color:rgba(255,255,255,.7);border-bottom:1px solid rgba(255,255,255,.2);padding-bottom:3px;transition:color .2s ease, border-color .2s ease;}
  .link-ghost:hover{color:#fff;border-color:#fff}
  .event-come-through{font-family:var(--mono);font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.65);}

  /* ─── SECTION 7: FINAL CTA ─── */
  .final-cta{background:var(--black);padding:160px var(--gutter);text-align:center;border-top:1px solid rgba(255,255,255,.04);}
  .final-cta h2{font-family:var(--display);font-size:96px;line-height:.92;letter-spacing:0;text-transform:uppercase;color:#fff;max-width:14ch;margin:0 auto;text-wrap:balance;}
  .final-cta h2 .blue{color:var(--accent)}
  .final-cta .sub{margin-top:24px;font-family:var(--body);font-size:18px;color:var(--grey-light);max-width:48ch;margin-left:auto;margin-right:auto;}
  .final-cta .btn-big{display:inline-flex;align-items:center;gap:14px;margin-top:48px;height:64px;padding:0 32px;border-radius:4px;background:var(--accent);color:#fff;font-family:var(--headline);font-weight:700;font-size:18px;transition:background .15s ease, transform .1s ease;}
  .final-cta .btn-big:hover{background:#4A78FF}
  .final-cta .btn-big:active{transform:scale(.99);background:var(--accent-deep)}
  .final-cta .btn-big .arr{display:grid;place-items:center;width:32px;height:32px;border-radius:999px;background:rgba(255,255,255,.18);}

  /* ─── SECTION 8: LEAD FORM ─── */
  .process-sec{background:var(--black);padding:120px var(--gutter);border-top:1px solid rgba(255,255,255,.04);scroll-margin-top:80px;}
  .process-wrap{max-width:var(--content-max);margin:0 auto;}
  .process-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid rgba(255,255,255,.08);margin-top:64px;}
  .process-step{padding:48px 40px 0 0;border-right:1px solid rgba(255,255,255,.08);}
  .process-step:last-child{border-right:0;padding-right:0;}
  .process-step:not(:first-child){padding-left:40px;}
  .process-step .sn{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);display:block;margin-bottom:20px;}
  .process-step h3{font-family:var(--display);font-size:38px;line-height:.95;text-transform:uppercase;color:#fff;letter-spacing:.005em;}
  .process-step p{margin-top:16px;font-family:var(--body);font-size:15px;line-height:1.6;color:rgba(255,255,255,.55);max-width:28ch;}
  .process-cta{margin-top:72px;border-top:1px solid rgba(255,255,255,.08);padding-top:48px;display:flex;align-items:center;justify-content:space-between;}
  .process-cta-meta{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.45);line-height:2;}
  .process-cta-meta span{color:#fff;font-weight:500;display:inline-block;width:90px}

  /* ─── FOOTER ─── */
  .footer{background:#0A0A0A;border-top:1px solid #1F1F1F;padding:80px var(--gutter) 32px;}
  .footer-grid{max-width:var(--content-max);margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:48px;padding-bottom:80px;border-bottom:1px solid #1F1F1F;}
  .footer-grid h4{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:18px;}
  .footer-grid ul{list-style:none;display:flex;flex-direction:column;gap:8px}
  .footer-grid ul a{font-family:var(--body);font-size:15px;color:rgba(255,255,255,.75);}
  .footer-grid ul a:hover{color:#fff}
  .footer-grid .lede{font-family:var(--body);font-size:15px;color:rgba(255,255,255,.65);max-width:32ch;line-height:1.55;margin-top:8px;}
  .footer .wordmark-row{max-width:var(--content-max);margin:0 auto;padding-top:48px;display:flex;justify-content:space-between;align-items:flex-end;}
  .footer .wordmark{font-family:var(--display);font-size:200px;line-height:.85;letter-spacing:.005em;text-transform:uppercase;color:#fff;}
  .footer .wordmark .slash{color:var(--accent);font-weight:400}
  .footer .legal{text-align:right;font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.3);line-height:1.7;}
  .footer .legal a:hover{color:#fff}

  @media (max-width: 1024px){
    body{font-size:15px}
    .ticker .t{font-size:64px}
    .brand-sec h2, .final-cta h2{font-size:72px}
    .book-grid .left h2{font-size:56px}
    .footer .wordmark{font-size:140px}
  }

  /* ─── MOBILE LAYOUT (max-width: 760px) ─── */
  @media (max-width: 760px) {
    .desktop-hero,.desktop-tagline,.desktop-log,.desktop-services,.desktop-brand,.desktop-event,.desktop-final-cta,.desktop-book,.desktop-footer { display: none !important; }
    .mobile-hero { position: fixed; inset: 0; z-index: 10; display: block; background:#0A0A0A; overflow:hidden; isolation:isolate; }
    .nav { display: none; }
    body { overflow: hidden; }

    /* ── Topbar ── */
    .mobile-topbar {
      position: absolute; top: 0; left: 0; right: 0; z-index: 80;
      padding: 12px 16px;
      padding-top: max(14px, env(safe-area-inset-top));
      display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(to bottom, rgba(0,0,0,.55) 0%, transparent 100%);
      transition: background .3s ease;
    }
    .mobile-topbar.scrolled {
      background: rgba(10,10,10,.86);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .mobile-topbar.opaque {
      background: rgba(10,10,10,.92);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .m-wordmark {
      display: inline-flex; align-items: center;
    }
    .m-wordmark img { height: 46px; width: auto; display: block; }
    .m-hamburger {
      width: 42px; height: 42px; display: grid; place-items: center;
      border: 1px solid rgba(255,255,255,.16); border-radius: 999px;
      background: rgba(0,0,0,.35); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      touch-action: manipulation; cursor: pointer;
    }
    .m-hamburger .lines { display: flex; flex-direction: column; gap: 4px; width: 16px; }
    .m-hamburger .lines span { display: block; height: 1.5px; background: #fff; width: 100%; }
    .m-hamburger .lines span:nth-child(2) { width: 11px; margin-left: auto; }

    /* ── Scroller ── */
    .mobile-scroller {
      position: absolute; inset: 0;
      overflow-y: auto; overflow-x: hidden;
      scroll-snap-type: y mandatory; scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    .mobile-scroller::-webkit-scrollbar { display: none; }

    /* ── Slides ── */
    .mobile-slide {
      position: relative; width: 100%; height: 100%;
      scroll-snap-align: start; scroll-snap-stop: always;
      background: #000; overflow: hidden;
    }
    .mobile-slide video {
      position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; background: #0a0a0a;
    }
    .mobile-slide::after {
      content: ''; position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(to bottom, rgba(0,0,0,.55) 0%, transparent 14%, transparent 60%, rgba(0,0,0,.92) 100%);
    }
    .mobile-tap-zone { position: absolute; inset: 0; z-index: 5; }

    /* ── Meta cluster (top-right per slide) ── */
    .mobile-meta {
      position: absolute; top: 68px; right: 16px; z-index: 30;
      display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
    }
    .m-pill {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(0,0,0,.45); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,.10); border-radius: 999px;
      color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .06em;
      padding: 6px 10px; height: 28px;
    }
    .m-pill.square { padding: 0; width: 42px; height: 42px; justify-content: center; touch-action: manipulation; cursor: pointer; }
    .m-pill svg { width: 16px; height: 16px; display: block; }

    /* ── Caption ── */
    .mobile-caption {
      position: absolute; left: 0; right: 0; bottom: 0;
      padding: 0 20px 28px; z-index: 25;
    }
    .m-eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .22em;
      text-transform: uppercase; color: rgba(255,255,255,.7);
      padding: 5px 8px; border: 1px solid rgba(255,255,255,.18); border-radius: 2px;
      background: rgba(0,0,0,.35); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      margin-bottom: 10px;
    }
    .m-eyebrow .dot { width: 5px; height: 5px; border-radius: 999px; background: #1F4FFF; flex-shrink: 0; }
    .m-headline {
      font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 22px; line-height: 1.15;
      letter-spacing: -.015em; color: #fff; text-wrap: balance; max-width: 18ch;
      text-shadow: 0 1px 0 rgba(0,0,0,.45); margin-bottom: 6px;
    }
    .m-byline {
      font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .04em;
      color: rgba(255,255,255,.55); margin-bottom: 18px;
    }
    .m-byline b { color: #fff; font-weight: 500; }
    .m-book-btn {
      display: flex; align-items: center; justify-content: space-between;
      width: 100%; height: 52px; background: #1F4FFF; color: #fff;
      border-radius: 4px; font-family: 'Archivo', sans-serif; font-weight: 700;
      font-size: 15px; letter-spacing: .01em; padding: 0 18px;
      transition: background .12s ease, transform .1s ease;
      touch-action: manipulation; cursor: pointer; position: relative; z-index: 30;
    }
    .m-book-btn:active { transform: scale(.985); background: #1638CC; }
    .m-book-btn .arr {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 999px; background: rgba(255,255,255,.16);
    }

    /* ── Progress dots (left edge, bar style) ── */
    .mobile-dots {
      position: absolute; left: 8px; top: 50%; transform: translateY(-50%); z-index: 35;
      display: flex; flex-direction: column; gap: 6px; pointer-events: none;
      transition: opacity .3s ease;
    }
    .mobile-dots .dot {
      width: 2px; height: 18px; border-radius: 2px;
      background: rgba(255,255,255,.18);
      transition: background .25s ease, height .25s ease;
    }
    .mobile-dots .dot.active { background: #1F4FFF; height: 22px; }

    /* ── Swipe hint ── */
    .m-hint {
      position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);
      z-index: 40; pointer-events: none; text-align: center;
      color: rgba(255,255,255,.5); opacity: 0; transition: opacity .6s ease;
    }
    .m-hint.show { opacity: 1; }
    .m-hint .h-arrow {
      width: 30px; height: 30px; border: 1.5px solid currentColor; border-radius: 999px;
      display: grid; place-items: center; margin: 0 auto 10px;
      animation: mFloatUp 1.6s ease-in-out infinite;
    }
    .m-hint .h-arrow svg { width: 14px; height: 14px; }
    .m-hint .h-lbl {
      font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .22em; text-transform: uppercase;
    }
    @keyframes mFloatUp { 0%,100%{transform:translateY(4px)} 50%{transform:translateY(-4px)} }

    /* ── Below the fold ── */
    .mobile-below {
      display: block;
      background: #0A0A0A; color: #fff;
      padding: 0 0 96px;
      scroll-snap-align: start;
    }
    .m-top-edge {
      height: 48px;
      background: linear-gradient(to top, #0A0A0A, transparent);
      margin-top: -48px; position: relative; z-index: 2;
    }

    /* Section header */
    .m-section-h {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 20px; margin-bottom: 16px;
    }
    .m-section-h .lbl {
      font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .22em;
      text-transform: uppercase; color: rgba(255,255,255,.55);
    }
    .m-section-h .lbl .num { color: #1F4FFF; margin-right: 6px; }
    .m-section-h .see-all {
      font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .06em;
      color: #1F4FFF; display: inline-flex; align-items: center; gap: 4px;
    }

    /* Garage */
    .m-garage { padding: 56px 0 0; }
    .m-garage-photo {
      position: relative; width: 100%; aspect-ratio: 4/5; overflow: hidden; background: #111;
    }
    .m-garage-photo img {
      width: 100%; height: 100%; object-fit: cover; display: block;
      filter: contrast(1.02) saturate(.95);
    }
    .m-garage-photo::after {
      content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 120px;
      background: linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0) 100%);
      pointer-events: none;
    }
    .m-garage-stamp {
      position: absolute; left: 16px; top: 14px; z-index: 2;
      font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .22em;
      text-transform: uppercase; color: rgba(255,255,255,.85);
      padding: 5px 8px; background: rgba(10,10,10,.55);
      border: 1px solid rgba(255,255,255,.18);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    }
    .m-garage-body { padding: 24px 20px 0; position: relative; z-index: 3; margin-top: -32px; }
    .m-lbl {
      font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .22em;
      text-transform: uppercase; color: rgba(255,255,255,.55); margin-bottom: 14px;
      display: flex; align-items: center; gap: 6px;
    }
    .m-lbl .num { color: #1F4FFF; margin-right: 6px; font-weight: 500; }
    .m-garage-body h2 {
      font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 32px;
      line-height: 1.05; letter-spacing: -.02em; color: #fff; text-wrap: balance;
    }
    .m-garage-body p {
      margin-top: 14px; font-size: 15px; line-height: 1.55; color: rgba(255,255,255,.7); max-width: 34ch;
    }
    .m-link-out {
      display: inline-flex; align-items: center; gap: 8px; margin-top: 18px;
      font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 15px;
      color: #fff; border-bottom: 1px solid rgba(255,255,255,.3); padding-bottom: 6px;
    }
    .m-link-out.blue { color: #1F4FFF; border-color: #1F4FFF; }

    /* Log */
    .m-log { padding: 56px 0 0; }
    .m-log-card { display: block; padding: 0 20px; margin-bottom: 24px; }
    .m-log-thumb {
      aspect-ratio: 16/10; background: #141414; border-radius: 4px; overflow: hidden;
      position: relative;
    }
    .m-log-thumb::before {
      content: ''; position: absolute; inset: 0; z-index: 1;
      background: rgba(0,0,0,.35);
    }
    .m-log-thumb .index {
      position: absolute; right: 14px; top: 10px; z-index: 2;
      font-family: 'Anton', Impact, sans-serif;
      font-size: 36px; line-height: 1; color: rgba(255,255,255,.12);
    }
    .m-log-thumb .stamp {
      position: absolute; left: 14px; bottom: 12px; right: 14px; z-index: 2;
      display: flex; align-items: center; justify-content: space-between;
      font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .18em;
      text-transform: uppercase; color: rgba(255,255,255,.75);
    }
    .m-log-card h3 {
      font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 22px;
      line-height: 1.15; letter-spacing: -.01em; margin: 14px 0 6px; color: #fff;
    }
    .m-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .m-tag {
      display: inline-flex; align-items: center;
      font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .16em;
      text-transform: uppercase; color: rgba(255,255,255,.7);
      padding: 4px 9px; border: 1px solid rgba(255,255,255,.16); border-radius: 999px;
    }

    /* Event */
    .m-event {
      margin-top: 56px; padding: 48px 20px 56px;
      border-top: 1px solid rgba(255,255,255,.06); border-bottom: 1px solid rgba(255,255,255,.06);
      position: relative; overflow: hidden;
    }
    .m-event::before {
      content: ''; position: absolute; right: -80px; top: -80px;
      width: 280px; height: 280px; border-radius: 999px;
      background: radial-gradient(circle, rgba(31,79,255,.10) 0%, transparent 70%);
      pointer-events: none;
    }
    .m-event-grid { display: flex; flex-direction: column; position: relative; z-index: 2; }
    .m-event-lbl {
      font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .22em;
      text-transform: uppercase; color: rgba(255,255,255,.5); margin-bottom: 18px;
    }
    .m-event-name {
      font-family: 'Anton', Impact, sans-serif;
      font-size: 56px; line-height: .95; letter-spacing: -.005em; text-transform: uppercase; color: #fff;
    }
    .m-event-date {
      font-family: 'Anton', Impact, sans-serif;
      font-size: 56px; line-height: .95; letter-spacing: -.005em; text-transform: uppercase;
      color: #1F4FFF; margin-top: 4px;
    }
    .m-event-mono {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 36px; padding-top: 18px;
      border-top: 1px dashed rgba(255,255,255,.08);
      font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .22em;
      text-transform: uppercase; color: rgba(255,255,255,.45);
    }
    .m-event-logos {
      display: flex; align-items: center; gap: 16px;
      margin-bottom: 28px; padding-bottom: 20px;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .m-evt-logo { height: 42px; width: auto; display: block; filter: drop-shadow(0 2px 8px rgba(0,0,0,.4)); }
    .m-evt-logo-izi { height: 42px; }
    .m-evt-x { font-family: 'Anton', Impact, sans-serif; font-size: 28px; color: rgba(255,255,255,.2); line-height: 1; }
    .m-event-lede { font-size: 14px; line-height: 1.55; color: rgba(255,255,255,.6); margin-top: 16px; max-width: 30ch; }
    .m-event-details-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
      margin-top: 24px; padding-top: 18px;
      border-top: 1px dashed rgba(255,255,255,.10);
    }
    .m-evt-k { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: rgba(255,255,255,.4); margin-bottom: 4px; }
    .m-evt-v { display: block; font-family: 'Archivo', sans-serif; font-weight: 600; font-size: 14px; color: #fff; }

    /* Book form */
    .m-process { padding: 64px 20px 48px; scroll-margin-top: 80px; }
    .m-process-h2 {
      font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 32px;
      line-height: 1.05; letter-spacing: -.02em; color: #fff; text-wrap: balance; margin-top: 8px;
    }
    .m-process-h2 em { font-style: normal; color: #1F4FFF; }
    .m-process-steps { margin-top: 40px; display: flex; flex-direction: column; }
    .m-process-step {
      display: flex; gap: 16px; padding: 20px 0;
      border-top: 1px solid rgba(255,255,255,.08);
    }
    .m-process-step:last-child { border-bottom: 1px solid rgba(255,255,255,.08); }
    .m-step-n {
      font-family: 'JetBrains Mono', monospace; font-size: 11px;
      letter-spacing: .22em; color: #1F4FFF; min-width: 24px; padding-top: 3px;
    }
    .m-step-body h4 {
      font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 17px;
      line-height: 1.2; color: #fff; letter-spacing: -.01em;
    }
    .m-step-body p { margin-top: 6px; font-size: 14px; line-height: 1.55; color: rgba(255,255,255,.55); }
    .m-process-meta {
      margin-top: 32px; font-family: 'JetBrains Mono', monospace; font-size: 10px;
      letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.35); line-height: 2;
    }
    .m-process-cta {
      display: flex; align-items: center; justify-content: space-between;
      height: 56px; padding: 0 20px; border-radius: 4px;
      background: #1F4FFF; color: #fff;
      font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 15px; letter-spacing: .01em;
      margin-top: 20px; text-decoration: none;
      transition: background .15s ease;
    }
    .m-process-cta:active { background: #1638CC; }
    .m-process-cta .arrow {
      display: grid; place-items: center; width: 30px; height: 30px;
      border-radius: 999px; background: rgba(255,255,255,.16);
    }

    /* Footer */
    .m-footer {
      padding: 48px 20px 24px;
      border-top: 1px solid rgba(255,255,255,.06);
      display: flex; flex-direction: column; gap: 18px;
    }
    .m-footer .big {
      font-family: 'Anton', Impact, sans-serif;
      font-size: 54px; letter-spacing: .04em; line-height: .95; text-transform: uppercase; color: #fff;
    }
    .m-footer .big .slash { color: #1F4FFF; }
    .m-footer .rows {
      display: flex; justify-content: space-between;
      font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .06em;
      color: rgba(255,255,255,.55);
    }

    /* Sticky CTA */
    .m-sticky-cta {
      position: absolute; left: 0; right: 0; bottom: 0; z-index: 70;
      height: 64px; padding: 0 16px;
      background: #1F4FFF; color: #fff;
      display: none; align-items: center; justify-content: space-between;
      font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 15px;
      box-shadow: 0 -16px 32px -8px rgba(0,0,0,.5);
      padding-bottom: max(0px, env(safe-area-inset-bottom));
      transform: translateY(100%);
      transition: transform .35s cubic-bezier(.2,.8,.2,1);
    }
    .m-sticky-cta.visible { display: flex; transform: translateY(0); }
    .m-sticky-cta .arrow {
      width: 32px; height: 32px; border-radius: 999px;
      background: rgba(255,255,255,.18); display: grid; place-items: center;
    }

    /* Drawer (full-screen slide from right) */
    .mobile-drawer {
      position: absolute; inset: 0; z-index: 100;
      background: #0A0A0A;
      transform: translateX(100%);
      transition: transform .32s cubic-bezier(.2,.8,.2,1);
      display: flex; flex-direction: column;
      padding: 60px 20px 28px;
    }
    .mobile-drawer.open { transform: translateX(0); }
    .mobile-drawer .row1 {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 36px;
    }
    .mobile-drawer .m-close {
      width: 42px; height: 42px; border-radius: 999px;
      border: 1px solid rgba(255,255,255,.16);
      display: grid; place-items: center;
      font-family: 'JetBrains Mono', monospace; font-size: 14px; color: #fff;
      background: none; cursor: pointer;
    }
    .mobile-drawer nav { display: flex; flex-direction: column; }
    .mobile-drawer nav a {
      font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 34px; line-height: 1.4;
      letter-spacing: -.015em; color: #fff; padding: 6px 0;
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .mobile-drawer nav a .ix {
      font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .18em;
      color: rgba(255,255,255,.35);
    }
    .mobile-drawer .services-sub {
      overflow: hidden; max-height: 0; transition: max-height .3s ease;
    }
    .mobile-drawer .services-sub.open { max-height: 360px; }
    .mobile-drawer .services-sub a {
      font-family: 'Inter Tight', sans-serif; font-weight: 500; font-size: 15px;
      color: rgba(255,255,255,.7); padding: 8px 0; border: 0;
      display: flex; align-items: center; justify-content: space-between;
    }
    .mobile-drawer .services-sub a::after { content: '→'; color: rgba(255,255,255,.3); font-family: 'JetBrains Mono', monospace; }
    .mobile-drawer .spacer { flex: 1; }
    .mobile-drawer .socials {
      display: flex; gap: 18px; margin-bottom: 18px;
      font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: .06em;
      color: rgba(255,255,255,.55);
    }
    .mobile-drawer .socials a { display: inline-flex; align-items: center; gap: 6px; }
    .mobile-drawer .socials a::after { content: '↗'; font-size: 10px; color: rgba(255,255,255,.4); }
    .mobile-drawer .dm-big {
      display: flex; align-items: center; justify-content: space-between;
      height: 58px; background: #1F4FFF; border-radius: 4px;
      padding: 0 20px; color: #fff;
      font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 16px;
    }

    .mobile-drawer-overlay { display: none; }

    /* ── Scroll nudge (first slide, fires after 4s) ── */
    @keyframes peekUp {
      0%   { transform: translateY(0); }
      35%  { transform: translateY(-10px); }
      65%  { transform: translateY(0); }
      82%  { transform: translateY(-5px); }
      100% { transform: translateY(0); }
    }
    .mobile-slide.nudging { animation: peekUp .95s cubic-bezier(.22,.61,.36,1); }

    /* ── Ensure topbar stays interactive above scroller ── */
    .mobile-topbar { pointer-events: auto; }
    .mobile-scroller { z-index: 5; }
    .mobile-topbar, .mobile-dots, .m-hint, .m-sticky-cta, .mobile-drawer { position: absolute; }
    .mobile-topbar { z-index: 80; }
    .m-sticky-cta { z-index: 70; }
    .mobile-drawer { z-index: 100; }

    /* ── Status-bar tap zone — mirrors iOS "tap status bar → scroll to top" ── */
    .m-status-bar-tap {
      position: absolute; top: 0; left: 0; right: 0;
      height: env(safe-area-inset-top, 44px);
      min-height: 0;
      z-index: 90;
      cursor: default;
    }
  }
`;

const desktopHlsScript = `
(() => {
  const vids = document.querySelectorAll('.hero video[data-hls]');
  if (!vids.length) return;

  function setup() {
    vids.forEach((v, i) => {
      const src = v.dataset.hls;
      if (!src) return;
      if (v.canPlayType('application/vnd.apple.mpegurl')) {
        v.src = src;
        if (i === 0) v.play().catch(() => {});
        return;
      }
      const hls = new window.Hls({ startLevel: -1, abrEwmaDefaultEstimate: 5000000 });
      hls.loadSource(src);
      hls.attachMedia(v);
      if (i === 0) {
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => v.play().catch(() => {}));
      }
    });
  }

  if (window.Hls && window.Hls.isSupported()) {
    setup();
  } else {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js';
    s.onload = setup;
    document.head.appendChild(s);
  }
})();
`;

const navScript = `
(() => {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const heroEl = document.querySelector('.hero');
  let lastY = -1;
  function onScroll(){
    const y = window.scrollY;
    if (y === lastY) return;
    lastY = y;
    const heroH = heroEl ? heroEl.offsetHeight : window.innerHeight;
    nav.classList.toggle('scrolled', y >= heroH - nav.offsetHeight);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hover-to-play on small tiles
  const tiles = document.querySelectorAll('.tile');
  tiles.forEach((t, i) => {
    const v = t.querySelector('video');
    if (!v) return;
    if (i === 0) return; // featured autoplays
    t.addEventListener('mouseenter', () => { try { v.currentTime = 0; v.play().catch(()=>{}); } catch(_){} });
    t.addEventListener('mouseleave', () => { try { v.pause(); v.currentTime = 0; } catch(_){} });
  });

  // Pause featured video when hero scrolls out of view
  const heroSection = document.querySelector('.hero');
  const featuredVideo = heroSection && heroSection.querySelector('.t1 video');
  if (featuredVideo && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach(en => {
        try {
          if (en.isIntersecting) { featuredVideo.play().catch(()=>{}); }
          else { featuredVideo.pause(); }
        } catch(_) {}
      });
    }, { threshold: 0.1 }).observe(heroSection);
  }

})();
`;



export default function HomePage() {
  return (
    <>
      <style>{pageCSS}</style>

      {/* ══════════════════════════════════════════
          MOBILE HERO (snap-scroll feed)
      ══════════════════════════════════════════ */}
      <div className="mobile-hero">

        {/* Status-bar tap zone — sits in the safe-area-inset-top gap above topbar content */}
        <div className="m-status-bar-tap" id="m-statusBarTap" aria-hidden="true"></div>

        {/* Topbar */}
        <header className="mobile-topbar" id="m-topbar">
          <a className="m-wordmark" href="/mc-site"><img src="/site/media/logo-mc.png" alt="Matthews / Clark" width="280" height="162" /></a>
          <button className="m-hamburger" id="m-menuBtn" aria-label="Open menu">
            <span className="lines"><span></span><span></span></span>
          </button>
        </header>

        {/* Progress bar-dots (left edge, built by JS) */}
        <div className="mobile-dots" id="m-progress" aria-hidden="true"></div>

        {/* Swipe hint */}
        <div className="m-hint" id="m-hint" aria-hidden="true">
          <div className="h-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="h-lbl">Swipe up</div>
        </div>

        {/* Snap-scroll container */}
        <main className="mobile-scroller" id="m-scroller">

          {/* Slide 1 */}
          <section className="mobile-slide" data-i="0">
            <video data-hls="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/091e4c93ea444ab896620c1595c2c7ab/manifest/video.m3u8" poster="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/091e4c93ea444ab896620c1595c2c7ab/thumbnails/thumbnail.jpg?time=3s" autoPlay muted loop playsInline preload="auto">
              <source src="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/091e4c93ea444ab896620c1595c2c7ab/manifest/video.m3u8" type="application/vnd.apple.mpegurl" />
            </video>
            <div className="mobile-tap-zone" data-toggle-sound aria-label="Toggle sound"></div>
            <div className="mobile-meta">
              <button className="m-pill square" data-sound aria-label="Toggle sound">
                <svg viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H3v6h3l5 4V5z" stroke="#fff" strokeWidth="1.7"/><path d="M16 8l5 8M21 8l-5 8" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"/></svg>
              </button>
              <span className="m-pill">1 / 3</span>
            </div>
            <div className="mobile-caption">
              <span className="m-eyebrow"><span className="dot"></span>M&amp;C × Izimoto · Welcome Back</span>
              <h2 className="m-headline">We didn&apos;t come back alone.</h2>
              <div className="m-byline"><b>Sam &amp; Keanan</b> · Cape Town</div>
              <a className="m-book-btn" href="/" data-book="">
                Get a Quote <span className="arr">→</span>
              </a>
            </div>
          </section>

          {/* Slide 2 */}
          <section className="mobile-slide" data-i="1">
            <video data-hls="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/038a7b49050c07eaa6581636361c97fd/manifest/video.m3u8" poster="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/038a7b49050c07eaa6581636361c97fd/thumbnails/thumbnail.jpg?time=3s" muted loop playsInline>
              <source src="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/038a7b49050c07eaa6581636361c97fd/manifest/video.m3u8" type="application/vnd.apple.mpegurl" />
            </video>
            <div className="mobile-tap-zone" data-toggle-sound aria-label="Toggle sound"></div>
            <div className="mobile-meta">
              <button className="m-pill square" data-sound aria-label="Toggle sound">
                <svg viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H3v6h3l5 4V5z" stroke="#fff" strokeWidth="1.7"/><path d="M16 8l5 8M21 8l-5 8" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"/></svg>
              </button>
              <span className="m-pill">2 / 3</span>
            </div>
            <div className="mobile-caption">
              <span className="m-eyebrow"><span className="dot"></span>Matte PPF · Kitted Cayenne</span>
              <h2 className="m-headline">Gloss is safe. Matte is a commitment.</h2>
              <div className="m-byline">Porsche Cayenne · <b>3 days</b></div>
              <a className="m-book-btn" href="/" data-book="">
                Get a Quote <span className="arr">→</span>
              </a>
            </div>
          </section>

          {/* Slide 3 */}
          <section className="mobile-slide" data-i="2">
            <video data-hls="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/f39e63b42e7d8c9a0c41fa23999300e1/manifest/video.m3u8" poster="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/f39e63b42e7d8c9a0c41fa23999300e1/thumbnails/thumbnail.jpg?time=3s" muted loop playsInline>
              <source src="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/f39e63b42e7d8c9a0c41fa23999300e1/manifest/video.m3u8" type="application/vnd.apple.mpegurl" />
            </video>
            <div className="mobile-tap-zone" data-toggle-sound aria-label="Toggle sound"></div>
            <div className="mobile-meta">
              <button className="m-pill square" data-sound aria-label="Toggle sound">
                <svg viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H3v6h3l5 4V5z" stroke="#fff" strokeWidth="1.7"/><path d="M16 8l5 8M21 8l-5 8" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"/></svg>
              </button>
              <span className="m-pill">3 / 3</span>
            </div>
            <div className="mobile-caption">
              <span className="m-eyebrow"><span className="dot"></span>The Apology · Defender</span>
              <h2 className="m-headline">Every panel came off. One had different plans.</h2>
              <div className="m-byline">Land Rover Defender · <b>Keanan</b></div>
              <a className="m-book-btn" href="/" data-book="">
                Get a Quote <span className="arr">→</span>
              </a>
            </div>
          </section>

          {/* Pre-init: runs during HTML parsing, before React hydration or afterInteractive scripts.
              Sets the muted DOM attribute (React's muted prop doesn't) and starts loading immediately.
              Marks each video with data-preinit so mobile-hero.js won't re-call load() and reset the buffer. */}
          <script dangerouslySetInnerHTML={{__html:`
(function(){
  if(window.innerWidth>860)return;
  var vids=document.querySelectorAll('#m-scroller video[data-hls]');
  var needsHls=false;
  vids.forEach(function(v,i){
    v.setAttribute('muted','');
    v.muted=true;
    if(v.canPlayType('application/vnd.apple.mpegurl')){
      v.dataset.preinit='1';
      v.load();
      if(i===0)v.addEventListener('canplay',function(){v.play().catch(function(){});},{once:true});
    } else {
      needsHls=true;
    }
  });
  // Load hls.js exactly once — not inside forEach which would create one tag per slide
  if(needsHls&&!window.Hls&&!document.querySelector('script[src*="hls.min.js"]')){
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js';
    s.async=true;
    document.head.appendChild(s);
  }
})();
          `}} />

          {/* ── Below the fold ── */}
          <div className="mobile-below" id="m-below">
            <div className="m-top-edge"></div>

            {/* Beat 1 — The Garage */}
            <section className="m-garage">
              <div className="m-garage-photo">
                <img src="/site/media/garage.jpg" alt="Inside the Matthews &amp; Clark garage, Cape Town" loading="lazy"/>
                <span className="m-garage-stamp">MATTHEWS / CLARK</span>
              </div>
              <div className="m-garage-body">
                <div className="m-lbl"><span className="num">01</span>The Garage</div>
                <h2>This is where the work happens.</h2>
                <p>M&amp;C is back — and we didn&apos;t come back alone. Izimoto, Johannesburg&apos;s most respected automotive boutique, just landed in Cape Town. PPF, wraps, ceramic, bodykits, full customisation — all of it, now on our doorstep. Cape Town, what are you building first?</p>
                <a className="m-link-out" href="#">Meet the team <span>→</span></a>
              </div>
            </section>

            {/* Beat 2 — The Log */}
            <section className="m-log">
              <div className="m-section-h">
                <span className="lbl"><span className="num">02</span>The Log</span>
                <a className="see-all" href="/log">See all →</a>
              </div>

              <a className="m-log-card" href="/log/2025-bmw-m3-g80-frozen-black-ceramic-coating">
                <div className="m-log-thumb" style={{backgroundImage:'url(/site/media/log-bmw-m3-g80.jpg)',backgroundSize:'cover',backgroundPosition:'center'}}>
                  <span className="index">01</span>
                  <div className="stamp"><span>JAN 2026</span><span>4 MIN</span></div>
                </div>
                <h3>BMW M3 G80 — Frozen Black</h3>
                <div className="m-tags">
                  <span className="m-tag">Matte Ceramic</span>
                  <span className="m-tag">Full Valet</span>
                </div>
              </a>

              <a className="m-log-card" href="/log/ferrari-612-scaglietti-full-detail">
                <div className="m-log-thumb" style={{backgroundImage:'url(/site/media/log-ferrari-612.jpg)',backgroundSize:'cover',backgroundPosition:'center'}}>
                  <span className="index">02</span>
                  <div className="stamp"><span>DEC 2025</span><span>5 MIN</span></div>
                </div>
                <h3>Ferrari 612 Scaglietti</h3>
                <div className="m-tags">
                  <span className="m-tag">Full Detail</span>
                  <span className="m-tag">Decontamination</span>
                </div>
              </a>
            </section>

            {/* Beat 3 — Next Event */}
            <section className="m-event">
              <div className="m-event-logos">
                <img src="/site/media/logo-mc.png" alt="Matthews / Clark" className="m-evt-logo" width="280" height="162" />
                <span className="m-evt-x">×</span>
                <img src="/brand/izimoto-logo.png" alt="Izimoto" className="m-evt-logo m-evt-logo-izi" width="200" height="74" />
              </div>
              <div className="m-event-grid">
                <div className="m-event-lbl"><span style={{color:'#1F4FFF',marginRight:'6px'}}>05</span>Next event · <span style={{color:'#1F4FFF'}}>Open event</span></div>
                <div className="m-event-name">The new shop</div>
                <div className="m-event-date">opens 14 June</div>
                <p className="m-event-lede">Izimoto just landed in Cape Town. Come walk the floor on opening morning — we&apos;re bringing out supercars and incredible builds for the day.</p>
                <div className="m-event-details-row">
                  <div><span className="m-evt-k">Where</span><span className="m-evt-v">3 Muir St, Woodstock</span></div>
                  <div><span className="m-evt-k">From</span><span className="m-evt-v">08h00 onwards</span></div>
                </div>
                <p style={{marginTop:'20px',fontFamily:"'JetBrains Mono',monospace",fontSize:'11px',letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(255,255,255,.55)'}}>Come through. Doors open 08:00.</p>
              </div>
              <div className="m-event-mono">
                <span>3 Muir St · 08h00</span>
                <span>OPEN EVENT</span>
              </div>
            </section>

            {/* How it works */}
            <section className="m-process" id="m-book">
              <div className="m-lbl"><span className="num">04</span>How it works</div>
              <h2 className="m-process-h2">From enquiry<br/>to <em>done.</em></h2>
              <div className="m-process-steps">
                <div className="m-process-step">
                  <span className="m-step-n">01</span>
                  <div className="m-step-body">
                    <h4>Tell us about the car</h4>
                    <p>Make, model, what you&apos;re after. Two minutes is enough to get started.</p>
                  </div>
                </div>
                <div className="m-process-step">
                  <span className="m-step-n">02</span>
                  <div className="m-step-body">
                    <h4>We come back same day</h4>
                    <p>Sam or Keanan replies personally — not a chatbot, not a system.</p>
                  </div>
                </div>
                <div className="m-process-step">
                  <span className="m-step-n">03</span>
                  <div className="m-step-body">
                    <h4>One conversation covers everything</h4>
                    <p>Spec, pricing, timeline. One honest reply about your specific car.</p>
                  </div>
                </div>
                <div className="m-process-step">
                  <span className="m-step-n">04</span>
                  <div className="m-step-body">
                    <h4>Drop it in, we handle the rest</h4>
                    <p>By appointment only. You&apos;ll hear from us throughout.</p>
                  </div>
                </div>
              </div>
              <div className="m-process-meta">
                3 Muir St, Woodstock · Mon–Fri 08–17 · Same-day reply
              </div>
              <a className="m-process-cta" href="/" data-book>
                <span>Get a Quote</span>
                <span className="arrow">→</span>
              </a>
            </section>

            {/* Footer */}
            <footer className="m-footer">
              <div className="big">MATTHEWS<br/><span className="slash">&amp;</span> CLARK</div>
              <div className="rows">
                <div>
                  CAPE TOWN<br/>
                  <span style={{color:'rgba(255,255,255,.35)'}}>By appointment only</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <a href="#">Instagram ↗</a><br/>
                  <a href="#">TikTok ↗</a>
                </div>
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'10px',letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(255,255,255,.3)',marginTop:'18px'}}>
                © 2026 — Built in Cape Town
              </div>
            </footer>
          </div>{/* /mobile-below */}

        </main>{/* /m-scroller */}

        {/* Sticky bottom CTA */}
        <a className="m-sticky-cta" id="m-stickyCta" href="/" data-book="">
          <span>Get a Quote</span>
          <span className="arrow">→</span>
        </a>

        {/* Full-screen drawer */}
        <aside className="mobile-drawer" id="m-drawer" aria-hidden="true">
          <div className="row1">
            <button className="m-close" id="m-closeDrawer" aria-label="Close menu">✕</button>
            <span className="m-wordmark"><img src="/site/media/logo-mc.png" alt="Matthews / Clark" width="280" height="162" /></span>
          </div>
          <nav id="m-mainNav">
            <a href="#" id="m-servicesToggle">Services <span className="ix">01</span></a>
            <div className="services-sub" id="m-servicesSub">
              <a href="/mc-site/ppf">PPF</a>
              <a href="/mc-site/wrapping">Wrapping</a>
              <a href="/mc-site/ceramic">Ceramic coating</a>
              <a href="/mc-site/correction">Paint correction</a>
              <a href="/mc-site/detailing">Detailing</a>
              <a href="/mc-site/body-kits">Bodykits</a>
              <a href="/mc-site/wheels">Wheels</a>
              <a href="/mc-site/starlight">Starlight</a>
            </div>
            <a href="#">The Log <span className="ix">02</span></a>
            <a href="/mc-site/community">Community <span className="ix">03</span></a>
            <a href="/mc-site/about">About <span className="ix">04</span></a>
            <a href="#" className="coming-soon-link">The Drops <span className="ix">05</span><span className="cs-tag">Coming Soon</span></a>
          </nav>
          <div className="spacer"></div>
          <div className="socials">
            <a href="#">Instagram</a>
            <a href="#">TikTok</a>
            <a href="#">WhatsApp</a>
          </div>
          <a className="dm-big" href="/" data-book="" data-close-drawer="">Get a Quote <span>→</span></a>
        </aside>

      </div>{/* /mobile-hero */}

      {/* overlay removed — drawer is full-screen */}

      {/* ══════════════════════════════════════════
          DESKTOP SECTIONS (hidden on mobile)
      ══════════════════════════════════════════ */}

      {/* HEADER */}
      <header className="nav" id="nav">
        <a className="brand" href="/" aria-label="Matthews / Clark — home">
          <span className="wm">Matthews<span className="slash">/</span>Clark</span>
          <span className="mono">Cape Town</span>
        </a>
        <nav className="links" aria-label="Primary">
          <a className="has-caret" href="/mc-site/services">Services <span>▾</span></a>
          <a href="#">The Log</a>
          <a href="/mc-site/community">Community</a>
          <a href="/mc-site/about">About</a>
        </nav>
        <div className="right">
          <a className="btn-accent" href="#book" data-book="">
            Book a Slot
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
        </div>
      </header>

      {/* SECTION 1: HERO */}
      <div className="desktop-hero">
        <section className="hero">
          <div className="hero-grid">
            <a className="tile t1" href="#" aria-label="Featured: M&C Welcome Back — new shop open">
              <video data-hls="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/091e4c93ea444ab896620c1595c2c7ab/manifest/video.m3u8" poster="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/091e4c93ea444ab896620c1595c2c7ab/thumbnails/thumbnail.jpg?time=3s" muted loop playsInline></video>
              <span className="tile-id"><b>FEATURED</b>  ·  01</span>
              <div className="featured-cap">
                <span className="eyebrow"><span className="pulse"></span>M&amp;C is back</span>
                <span className="stag">Welcome Back · M&amp;C × Izimoto</span>
                <span className="desc">We didn&apos;t come back alone.</span>
                <span className="meta">Sam &amp; Keanan · New shop open · Cape Town</span>
              </div>
            </a>

            <div className="brand-bay">
              <h1>Cape Town&apos;s most<br/>unserious <span className="blue">detailers.</span></h1>
              <div className="row-bot">
                <div className="cta-pair">
                  <a className="cta-primary" href="/" data-book="">
                    Get a Quote
                    <span className="arr">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  </a>
                  <a className="cta-ghost" href="/mc-site/work">See the work →</a>
                </div>
                <div className="scroll-cue"><span className="line"></span>Scroll</div>
              </div>
            </div>

            <div className="strip">
              <a className="tile t2" href="/mc-site/ceramic">
                <video data-hls="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/038a7b49050c07eaa6581636361c97fd/manifest/video.m3u8" poster="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/038a7b49050c07eaa6581636361c97fd/thumbnails/thumbnail.jpg?time=3s" muted loop playsInline></video>
                <span className="tile-id">02 · Matte PPF</span>
                <div className="tile-caption">
                  <span className="stag">Matte PPF / Widebody Cayenne</span>
                  <span className="desc">Gloss is safe. Matte is a commitment. <span className="arr">→</span></span>
                </div>
              </a>
              <a className="tile t3" href="/mc-site/wrapping">
                <video data-hls="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/f39e63b42e7d8c9a0c41fa23999300e1/manifest/video.m3u8" poster="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com/f39e63b42e7d8c9a0c41fa23999300e1/thumbnails/thumbnail.jpg?time=3s" muted loop playsInline></video>
                <span className="tile-id">03 · Satin PPF</span>
                <div className="tile-caption">
                  <span className="stag">Satin PPF / Defender / Panel-off</span>
                  <span className="desc">Every panel came off. One had different plans. <span className="arr">→</span></span>
                </div>
              </a>
              <a className="tile t4" href="/mc-site/correction">
                <div className="poster">VIDEO  /  MACAN GTS</div>
                <span className="tile-id">04 · Correction</span>
                <div className="tile-caption">
                  <span className="stag">Correction / 6-stage</span>
                  <span className="desc">Macan GTS. Swirls gone. <span className="arr">→</span></span>
                </div>
              </a>
              <a className="tile t5" href="/mc-site/starlight">
                <div className="poster">VIDEO  /  G63  /  STARLIGHT</div>
                <span className="tile-id">05 · Starlight</span>
                <div className="tile-caption">
                  <span className="stag">Starlight / Interior</span>
                  <span className="desc">G63. 1,200 fibres hand-set. <span className="arr">→</span></span>
                </div>
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* SECTION 2: TAGLINE TICKER */}
      <div className="desktop-tagline">
        <section className="tagline" aria-label="Tagline">
          <div className="ticker" aria-hidden="true">
            <div className="t">Serious work. <span className="slash">/</span> Unserious content. <span className="slash">/</span> Serious work. <span className="slash">/</span> Unserious content. <span className="slash">/</span></div>
            <div className="t">Serious work. <span className="slash">/</span> Unserious content. <span className="slash">/</span> Serious work. <span className="slash">/</span> Unserious content. <span className="slash">/</span></div>
          </div>
        </section>
      </div>

      {/* SECTION 3: THE LOG */}
      <div className="desktop-log">
        <section className="log-sec">
          <div className="container">
            <div className="sec-h">
              <span className="label">
                <span className="num">02</span>
                <span>The Log</span>
                <span className="div"></span>
                <span className="sub">Workshop entries · Recent</span>
              </span>
              <a className="see-all" href="/log">
                See all entries
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
            </div>

            <a className="log-featured" href="/log/2025-bmw-m3-g80-frozen-black-ceramic-coating">
              <div className="img" style={{backgroundImage:'url(/site/media/log-bmw-m3-g80.jpg)',backgroundSize:'cover',backgroundPosition:'center'}}>
                <span className="ix">01</span>
                <span className="badge">Latest</span>
              </div>
              <div className="body">
                <div>
                  <div className="meta">
                    <span><span className="b">Jan 2026</span></span>
                    <span className="dot"></span>
                    <span>Lead <span className="b">Sam</span></span>
                    <span className="dot"></span>
                    <span>4 min read</span>
                  </div>
                  <h3>The Frozen Black M3.<br/><span className="blue">Matte ceramic.</span> Carbon buckets.</h3>
                  <p className="lede">Full valet first — clay, iron removal, the works. Then matte-specific ceramic that won&apos;t haze the finish. Carbon buckets treated while we had it. Properly protected.</p>
                  <div className="tags">
                    <span>Matte Ceramic</span>
                    <span>Full Valet</span>
                    <span>BMW M3</span>
                  </div>
                </div>
                <span className="read">
                  Read the entry
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </div>
            </a>

            <div className="log-list">
              <a className="log-row" href="/log/ferrari-612-scaglietti-full-detail">
                <span className="ix">02</span>
                <span className="when">Dec 2025</span>
                <div className="title-block">
                  <h4>Ferrari 612 Scaglietti</h4>
                  <span className="who">Lead <b>Keanan</b> · 5 min read</span>
                </div>
                <div className="tags"><span>Full Detail</span><span>Decontamination</span></div>
                <span className="arrow">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </a>
              <a className="log-row" href="/log/2025-bmw-m2-competition-sunset-orange-ceramic-coating">
                <span className="ix">03</span>
                <span className="when">Nov 2025</span>
                <div className="title-block">
                  <h4>BMW M2 Competition — Sunset Orange</h4>
                  <span className="who">Lead <b>Sam</b> · 4 min read</span>
                </div>
                <div className="tags"><span>Ceramic</span><span>BMW M2C</span></div>
                <span className="arrow">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </a>
              <a className="log-row" href="/log/2025-audi-r8-v8-full-valet">
                <span className="ix">04</span>
                <span className="when">Oct 2025</span>
                <div className="title-block">
                  <h4>Audi R8 V8 — Gen 1</h4>
                  <span className="who">Lead <b>Keanan</b> · 3 min read</span>
                </div>
                <div className="tags"><span>Full Valet</span><span>Audi R8</span></div>
                <span className="arrow">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* SECTION 4: SERVICES STRIP */}
      <div className="desktop-services">
        <section className="services">
          <div className="container" style={{paddingTop:0}}>
            <div className="sec-h" style={{marginBottom:'32px',paddingTop:0}}>
              <span className="label"><span className="num">03</span>Services</span>
              <a className="see-all" href="/mc-site/services">All services
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
            </div>
          </div>
          <div className="svc-grid">
            <a className="svc" href="/mc-site/ppf"><span className="ix">01</span><span className="name">PPF</span><span className="lbl">Protection film</span><span className="arr">→</span></a>
            <a className="svc" href="/mc-site/wrapping"><span className="ix">02</span><span className="name">Wrap</span><span className="lbl">Full / part</span><span className="arr">→</span></a>
            <a className="svc" href="/mc-site/ceramic"><span className="ix">03</span><span className="name">Ceramic</span><span className="lbl">10-yr coat</span><span className="arr">→</span></a>
            <a className="svc" href="/mc-site/correction"><span className="ix">04</span><span className="name">Correction</span><span className="lbl">Paint, swirls</span><span className="arr">→</span></a>
            <a className="svc" href="/mc-site/detailing"><span className="ix">05</span><span className="name">Detailing</span><span className="lbl">Inside &amp; out</span><span className="arr">→</span></a>
            <a className="svc" href="/mc-site/body-kits"><span className="ix">06</span><span className="name">Body kits</span><span className="lbl">Source &amp; fit</span><span className="arr">→</span></a>
            <a className="svc" href="/mc-site/wheels"><span className="ix">07</span><span className="name">Wheels</span><span className="lbl">Refinish / coat</span><span className="arr">→</span></a>
            <a className="svc" href="/mc-site/starlight"><span className="ix">08</span><span className="name">Starlight</span><span className="lbl">Hand-set fibres</span><span className="arr">→</span></a>
          </div>
        </section>
      </div>

      {/* SECTION 5: BRAND + FOUNDERS */}
      <div className="desktop-brand">
        <section className="brand-sec">
          <div className="copy">
            <div className="label"><span className="num">04</span>Who we are</div>
            <h2>Serious work.<br/><span className="blue">Unserious</span> content.</h2>
            <p>Keanan and Sam. We own every conversation — brief, quote, schedule, and sign-off. No account managers between you and us. The physical work happens at Izimoto&apos;s Woodstock studio, Johannesburg&apos;s most respected automotive boutique, now in Cape Town.</p>
            <p>PPF, wraps, ceramic, correction, body kits, wheels, starlight — done to the standard that earned Izimoto a decade of repeat business from the most serious car owners in the country. We scope the job properly, manage every detail, and don&apos;t hand the car back until it&apos;s right.</p>
            <a className="link" href="/mc-site/about">
              Meet the team
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </div>
          <div className="photo">
            <img src="/site/media/garage.jpg" alt="Inside the Matthews &amp; Clark garage, Woodstock, Cape Town" loading="lazy"/>
            <span className="stamp">MATTHEWS / CLARK</span>
            <span className="credit">SHOT IN-HOUSE<br/>WOODSTOCK, CPT</span>
          </div>
        </section>
      </div>

      {/* SECTION 6: NEXT EVENT */}
      <div className="desktop-event">
        <section className="event-sec">
          <div className="event-wrap">
            <div className="event-top">
              <span className="ix">
                <span className="num">05</span>
                <span>Next event</span>
                <span className="div"></span>
                <span className="sub">Opening morning · Come through</span>
              </span>
              <span className="live"><span className="dot"></span>Open event</span>
            </div>

            <div className="event-grid">
              <div className="lockup">
                <img className="logo mc" src="/site/media/logo-mc.png" alt="Matthews / Clark" width="280" height="162"/>
                <span className="lockup-x">×</span>
                <img className="logo izi" src="/brand/izimoto-logo.png" alt="Izimoto" width="200" height="74"/>
              </div>

              <h2 className="event-date">
                Sunday <span className="blue">14<span className="scribble"></span></span> June
              </h2>

              <h3 className="event-title">The new shop <span className="blue">opens.</span></h3>

              <p className="event-lede">Izimoto just landed in Cape Town — and this is their new studio. Come walk the floor on opening morning. We&apos;re lining up some incredible machinery for the day: supercars, rare builds, the kind of selection that doesn&apos;t usually park in one place. Keanan and Sam from M&amp;C will be there.</p>

              <div className="event-details">
                <div className="cell">
                  <span className="k">— Where</span>
                  <span className="v">3 Muir St<span className="sub">Woodstock, CPT</span></span>
                </div>
                <div className="cell">
                  <span className="k">— From</span>
                  <span className="v">08:00 onwards<span className="sub">Come through</span></span>
                </div>
                <div className="cell">
                  <span className="k">— Who</span>
                  <span className="v">Open doors<span className="sub">Everyone welcome — pull in</span></span>
                </div>
                <div className="cell">
                  <span className="k">— Bring</span>
                  <span className="v">Your car<span className="sub">Parking on the block</span></span>
                </div>
              </div>

              <div className="event-actions">
                <span className="event-come-through">Come through. Doors open 08:00.</span>
                <a className="link-ghost" href="#">See past events →</a>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* SECTION 7: FINAL CTA */}
      <div className="desktop-final-cta">
        <section className="final-cta">
          <h2>Your car deserves<br/>the right <span className="blue">hands.</span></h2>
          <p className="sub">Tell us about the car. We&apos;ll come back same day with a real quote — no drop-ins, no chase. Just one form and a fast reply.</p>
          <a className="btn-big" href="/" data-book="">
            Get a Quote
            <span className="arr">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </a>
        </section>
      </div>

      {/* SECTION 8: HOW IT WORKS */}
      <div className="desktop-book">
        <section className="process-sec" id="book">
          <div className="process-wrap">
            <div className="sec-h">
              <span className="label"><span className="num">07</span>How it works</span>
              <a className="btn-accent" href="#" data-book>
                Get a Quote
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
            </div>
            <div className="process-steps">
              <div className="process-step">
                <span className="sn">01</span>
                <h3>Tell us about the car.</h3>
                <p>Make, model, what you&apos;re after. Two minutes is enough — we take it from there.</p>
              </div>
              <div className="process-step">
                <span className="sn">02</span>
                <h3>We come back same day.</h3>
                <p>Sam or Keanan replies personally. Not a system, not a chatbot. A real answer about your specific car.</p>
              </div>
              <div className="process-step">
                <span className="sn">03</span>
                <h3>One call covers everything.</h3>
                <p>Service spec, realistic pricing, exact timeline. One honest conversation — no surprises later.</p>
              </div>
              <div className="process-step">
                <span className="sn">04</span>
                <h3>Drop it in. We handle the rest.</h3>
                <p>By appointment only. You&apos;ll hear from us at every step — drop-off through to collection.</p>
              </div>
            </div>
            <div className="process-cta">
              <div className="process-cta-meta">
                <div><span>Studio</span>3 Muir St, Woodstock</div>
                <div><span>Hours</span>Mon–Fri 08h00–17h00</div>
                <div><span>Reply</span>Same day, usually within the hour</div>
              </div>
              <a className="btn-accent" href="#" data-book style={{fontSize:'18px',padding:'0 36px',height:'60px',borderRadius:'8px'}}>
                Get a Quote
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <div className="desktop-footer">
        <footer className="footer">
          <div className="footer-grid">
            <div>
              <h4>— Matthews/Clark</h4>
              <p className="lede">Protection &amp; presence for the cars you&apos;ve worked for. Cape Town, by appointment.</p>
            </div>
            <div>
              <h4>Services</h4>
              <ul>
                <li><a href="/mc-site/ppf">PPF</a></li>
                <li><a href="/mc-site/ceramic">Ceramic</a></li>
                <li><a href="/mc-site/wrapping">Wrap</a></li>
                <li><a href="/mc-site/correction">Correction</a></li>
                <li><a href="/mc-site/detailing">Detailing</a></li>
              </ul>
            </div>
            <div>
              <h4>Studio</h4>
              <ul>
                <li><a href="/mc-site/about">About</a></li>
                <li><a href="#">The Log</a></li>
                <li><a href="/mc-site/community">Community</a></li>
              </ul>
            </div>
            <div>
              <h4>Find us</h4>
              <ul>
                <li><a href="#">Instagram ↗</a></li>
                <li><a href="#">TikTok ↗</a></li>
                <li><a href="#">WhatsApp ↗</a></li>
              </ul>
            </div>
            <div>
              <h4>Visit</h4>
              <ul>
                <li>3 Muir St, Woodstock</li>
                <li>By appointment only</li>
                <li>Mon–Fri 08–17</li>
                <li><a href="/" data-book="">Get a Quote →</a></li>
              </ul>
            </div>
          </div>
          <div className="wordmark-row">
            <div className="wordmark">M<span className="slash">/</span>C</div>
            <div className="legal">
              © 2026 Matthews/Clark<br/>
              Cape Town, South Africa<br/>
              <a href="#">Terms</a>  ·  <a href="#">Privacy</a>
            </div>
          </div>
        </footer>
      </div>

      <script dangerouslySetInnerHTML={{ __html: navScript }} />
      <Script id="desktop-hls" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: desktopHlsScript }} />
      <Script src="/site/mobile-hero.js" strategy="afterInteractive" />
    </>
  );
}
