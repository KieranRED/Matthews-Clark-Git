export const metadata = {
  title: 'Matthews / Clark — Cape Town',
  description: "Cape Town's most unserious detailers. PPF, ceramic, wrapping, paint correction and more. By appointment, Woodstock.",
};

const pageCSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#0D0D0D;color:#fff;-webkit-font-smoothing:antialiased;overflow-x:hidden}
  body{font-family:'Inter Tight',system-ui,sans-serif;font-size:16px;line-height:1.55}
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
    font-family:var(--display);font-size:22px;
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
  .log-featured .img{position:relative;aspect-ratio:4/3;background:var(--grey-dark);overflow:hidden;border:1px solid rgba(255,255,255,.06);}
  .log-featured .img::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 70%, rgba(31,79,255,.16), transparent 60%),linear-gradient(155deg, #1d1d1d 0%, #050505 100%);transition:transform .4s ease;}
  .log-featured:hover .img::before{transform:scale(1.02)}
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
  .lockup .logo{display:block;height:120px;width:auto;flex-shrink:0;filter:drop-shadow(0 8px 30px rgba(0,0,0,.45));}
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
  .book{background:var(--black);padding:120px var(--gutter);border-top:1px solid rgba(255,255,255,.04);scroll-margin-top:80px;}
  .book-grid{max-width:var(--content-max);margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:start;}
  .book-grid .left .label{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-bottom:24px;}
  .book-grid .left .label .num{color:var(--accent);margin-right:8px;font-weight:500}
  .book-grid .left h2{font-family:var(--display);font-size:72px;line-height:.95;letter-spacing:0;text-transform:uppercase;color:#fff;}
  .book-grid .left h2 .blue{color:var(--accent)}
  .book-grid .left p{margin-top:24px;font-family:var(--body);font-size:17px;line-height:1.55;color:var(--grey-light);max-width:38ch;}
  .book-grid .left .mono-list{margin-top:36px;border-top:1px solid var(--border);padding-top:24px;font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5);line-height:1.9;}
  .book-grid .left .mono-list .k{color:#fff;font-weight:500;display:inline-block;width:120px}
  form.book-form{display:flex;flex-direction:column;gap:24px;position:relative}
  .field{display:flex;flex-direction:column;gap:8px}
  .field .ftag{font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.45);}
  .field .ftag .req{color:var(--accent);margin-left:6px}
  .field input, .field select, .field textarea{background:var(--grey-dark);border:1px solid var(--border);color:#fff;font:inherit;font-family:var(--headline);font-weight:500;font-size:17px;letter-spacing:-.005em;padding:16px 18px;border-radius:8px;outline:none;width:100%;transition:border-color .2s ease, background .2s ease;}
  .field textarea{resize:vertical;min-height:96px;font-family:var(--body);font-weight:400;font-size:16px}
  .field input::placeholder, .field textarea::placeholder, .field select{color:rgba(255,255,255,.4)}
  .field input:focus, .field select:focus, .field textarea:focus{border-color:var(--accent);background:#1c1c1c;}
  .field .row2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .submit-btn{display:flex;align-items:center;justify-content:center;gap:14px;height:60px;padding:0 24px;border-radius:8px;background:var(--accent);color:#fff;font-family:var(--headline);font-weight:700;font-size:16px;cursor:pointer;border:0;transition:background .15s ease, transform .1s ease;margin-top:8px;}
  .submit-btn:hover{background:#4A78FF}
  .submit-btn:active{transform:scale(.985);background:var(--accent-deep)}
  .submit-btn .arr{display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:rgba(255,255,255,.18);}
  form.book-form.sent .field,form.book-form.sent .submit-btn,form.book-form.sent .consent{display:none}
  form.book-form.sent .sent-msg{display:flex}
  .sent-msg{display:none;flex-direction:column;gap:16px;padding:48px;border:1px solid var(--accent);background:rgba(31,79,255,.06);border-radius:8px;}
  .sent-msg .mono{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);}
  .sent-msg .big{font-family:var(--display);font-size:42px;line-height:1;letter-spacing:.005em;text-transform:uppercase;color:#fff;}
  .consent{font-family:var(--mono);font-size:10px;letter-spacing:.14em;line-height:1.7;text-transform:uppercase;color:rgba(255,255,255,.4);}
  .consent a{color:var(--accent);border-bottom:1px solid var(--accent)}

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
`;

const navScript = `
(() => {
  const nav = document.getElementById('nav');
  if (!nav) return;
  let lastY = -1;
  function onScroll(){
    const y = window.scrollY;
    if (y === lastY) return;
    lastY = y;
    nav.classList.toggle('scrolled', y > 60);
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

  // Book-a-Slot smooth scroll
  document.querySelectorAll('[data-book]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const t = document.getElementById('book');
      if (!t) {
        window.location.href = 'https://matthewsandclark.co.za';
        return;
      }
      window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 64, behavior:'smooth' });
      setTimeout(() => {
        const f = t.querySelector('input,select,textarea');
        if (f) f.focus({ preventScroll: true });
      }, 700);
    });
  });
})();
`;

export default function HomePage() {
  return (
    <>
      <style>{pageCSS}</style>

      {/* HEADER */}
      <header className="nav" id="nav">
        <a className="brand" href="/" aria-label="Matthews / Clark — home">
          <span className="wm">Matthews<span className="slash">/</span>Clark</span>
          <span className="mono">Cape Town</span>
        </a>
        <nav className="links" aria-label="Primary">
          <a className="has-caret" href="/services">Services <span>▾</span></a>
          <a href="#">The Log</a>
          <a href="/community">Community</a>
          <a href="/about">About</a>
        </nav>
        <div className="right">
          <a className="btn-accent" href="#book" data-book="">
            Book a Slot
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
        </div>
      </header>

      {/* SECTION 1: HERO */}
      <section className="hero">
        <div className="hero-grid">
          <a className="tile t1" href="#" aria-label="Featured: Ferrari 488 Pista — full front PPF">
            <video src="/site/media/video-1.mp4" autoPlay muted loop playsInline preload="auto"></video>
            <span className="tile-id"><b>FEATURED</b>  ·  01</span>
            <div className="featured-cap">
              <span className="eyebrow"><span className="pulse"></span>Now in the studio</span>
              <span className="stag">PPF / Full front / 3-day</span>
              <span className="desc">Ferrari 488 Pista. Front-end before the road gets to it.</span>
              <span className="meta">Lead <b>Keanan</b> · Started 19 May · Day 2 of 3</span>
            </div>
          </a>

          <div className="brand-bay">
            <h1>Cape Town&apos;s most<br/>unserious <span className="blue">detailers.</span></h1>
            <div className="row-bot">
              <div className="cta-pair">
                <a className="cta-primary" href="#book" data-book="">
                  Book a Slot
                  <span className="arr">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </a>
                <a className="cta-ghost" href="/work">See the work →</a>
              </div>
              <div className="scroll-cue"><span className="line"></span>Scroll</div>
            </div>
          </div>

          <div className="strip">
            <a className="tile t2" href="/ceramic">
              <video src="/site/media/video-2.mp4" muted loop playsInline preload="metadata"></video>
              <span className="tile-id">02 · Ceramic</span>
              <div className="tile-caption">
                <span className="stag">Ceramic / 10-yr</span>
                <span className="desc">M4 CS. Glass-flat correction. <span className="arr">→</span></span>
              </div>
            </a>
            <a className="tile t3" href="/wrapping">
              <video src="/site/media/video-3.mp4" muted loop playsInline preload="metadata"></video>
              <span className="tile-id">03 · Wrap</span>
              <div className="tile-caption">
                <span className="stag">Wrap / Full</span>
                <span className="desc">GT3 RS. Satin liquid metal. <span className="arr">→</span></span>
              </div>
            </a>
            <a className="tile t4" href="/correction">
              <div className="poster">VIDEO  /  MACAN GTS</div>
              <span className="tile-id">04 · Correction</span>
              <div className="tile-caption">
                <span className="stag">Correction / 6-stage</span>
                <span className="desc">Macan GTS. Swirls gone. <span className="arr">→</span></span>
              </div>
            </a>
            <a className="tile t5" href="/starlight">
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

      {/* SECTION 2: TAGLINE TICKER */}
      <section className="tagline" aria-label="Tagline">
        <div className="ticker" aria-hidden="true">
          <div className="t">Serious work. <span className="slash">/</span> Unserious content. <span className="slash">/</span> Serious work. <span className="slash">/</span> Unserious content. <span className="slash">/</span></div>
          <div className="t">Serious work. <span className="slash">/</span> Unserious content. <span className="slash">/</span> Serious work. <span className="slash">/</span> Unserious content. <span className="slash">/</span></div>
        </div>
      </section>

      {/* SECTION 3: THE LOG */}
      <section className="log-sec">
        <div className="container">
          <div className="sec-h">
            <span className="label">
              <span className="num">02</span>
              <span>The Log</span>
              <span className="div"></span>
              <span className="sub">Workshop entries · Q2 2026</span>
            </span>
            <a className="see-all" href="#">
              See all entries
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </div>

          <a className="log-featured" href="#">
            <div className="img">
              <span className="ix">01</span>
              <span className="ph">PHOTO / FEATURED LOG</span>
              <span className="badge">Latest</span>
            </div>
            <div className="body">
              <div>
                <div className="meta">
                  <span><span className="b">May 2026</span></span>
                  <span className="dot"></span>
                  <span>Lead <span className="b">Sam</span></span>
                  <span className="dot"></span>
                  <span>4 min read</span>
                </div>
                <h3>Marc&apos;s Macan GTS.<br/><span className="blue">Three days.</span> One car.</h3>
                <p className="lede">Wheels off, six-stage correction, two layers of ceramic, then the kind of inspection most shops won&apos;t agree to. Marc&apos;s seen the swirls go.</p>
                <div className="tags">
                  <span>Ceramic</span>
                  <span>Correction</span>
                  <span>Wheels off</span>
                </div>
              </div>
              <span className="read">
                Read the entry
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </div>
          </a>

          <div className="log-list">
            <a className="log-row" href="#">
              <span className="ix">02</span>
              <span className="when">Apr 2026</span>
              <div className="title-block">
                <h4>Liam&apos;s BMW M4 Competition</h4>
                <span className="who">Lead <b>Keanan</b> · 6 min read</span>
              </div>
              <div className="tags"><span>Front PPF</span><span>Ceramic</span><span>Wheel coat</span></div>
              <span className="arrow">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </a>
            <a className="log-row" href="#">
              <span className="ix">03</span>
              <span className="when">Apr 2026</span>
              <div className="title-block">
                <h4>James&apos;s AMG G63</h4>
                <span className="who">Lead <b>Sam</b> · 5 min read</span>
              </div>
              <div className="tags"><span>Wrap</span><span>Starlight</span><span>Body kit</span></div>
              <span className="arrow">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </a>
            <a className="log-row" href="#">
              <span className="ix">04</span>
              <span className="when">Mar 2026</span>
              <div className="title-block">
                <h4>Sarah&apos;s Ford Mustang GT</h4>
                <span className="who">Lead <b>Keanan</b> · 4 min read</span>
              </div>
              <div className="tags"><span>Detailing</span><span>Ceramic</span></div>
              <span className="arrow">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 4: SERVICES STRIP */}
      <section className="services">
        <div className="container" style={{paddingTop:0}}>
          <div className="sec-h" style={{marginBottom:'32px',paddingTop:0}}>
            <span className="label"><span className="num">03</span>Services</span>
            <a className="see-all" href="/services">All services
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </div>
        </div>
        <div className="svc-grid">
          <a className="svc" href="/ppf"><span className="ix">01</span><span className="name">PPF</span><span className="lbl">Protection film</span><span className="arr">→</span></a>
          <a className="svc" href="/wrapping"><span className="ix">02</span><span className="name">Wrap</span><span className="lbl">Full / part</span><span className="arr">→</span></a>
          <a className="svc" href="/ceramic"><span className="ix">03</span><span className="name">Ceramic</span><span className="lbl">10-yr coat</span><span className="arr">→</span></a>
          <a className="svc" href="/correction"><span className="ix">04</span><span className="name">Correction</span><span className="lbl">Paint, swirls</span><span className="arr">→</span></a>
          <a className="svc" href="/detailing"><span className="ix">05</span><span className="name">Detailing</span><span className="lbl">Inside &amp; out</span><span className="arr">→</span></a>
          <a className="svc" href="/body-kits"><span className="ix">06</span><span className="name">Body kits</span><span className="lbl">Source &amp; fit</span><span className="arr">→</span></a>
          <a className="svc" href="/wheels"><span className="ix">07</span><span className="name">Wheels</span><span className="lbl">Refinish / coat</span><span className="arr">→</span></a>
          <a className="svc" href="/starlight"><span className="ix">08</span><span className="name">Starlight</span><span className="lbl">Hand-set fibres</span><span className="arr">→</span></a>
        </div>
      </section>

      {/* SECTION 5: BRAND + FOUNDERS */}
      <section className="brand-sec">
        <div className="copy">
          <div className="label"><span className="num">04</span>Who we are</div>
          <h2>Serious work.<br/><span className="blue">Unserious</span> content.</h2>
          <p>We&apos;re Keanan and Sam — two of the three owners and the two faces of the brand. If you book M&amp;C, one of us is on your car. Not a contractor. Not &ldquo;the team.&rdquo; Us.</p>
          <p>We do PPF, ceramic, wraps, correction, detailing, body kits, wheels and starlight. The work is on camera. The mistakes are owned in writing. The handover is in person.</p>
          <a className="link" href="/about">
            Meet the team
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
        </div>
        <div className="photo">
          <img src="/site/media/garage.jpg" alt="Inside the Matthews &amp; Clark garage, Woodstock, Cape Town" loading="lazy"/>
          <span className="stamp">PHOTO  /  STUDIO  /  WOODSTOCK</span>
          <span className="credit">SHOT IN-HOUSE<br/>WOODSTOCK, CPT</span>
        </div>
      </section>

      {/* SECTION 6: NEXT EVENT */}
      <section className="event-sec">
        <div className="event-wrap">
          <div className="event-top">
            <span className="ix">
              <span className="num">05</span>
              <span>Next event</span>
              <span className="div"></span>
              <span className="sub">Opening night · One night only</span>
            </span>
            <span className="live"><span className="dot"></span>RSVPs open</span>
          </div>

          <div className="event-grid">
            <div className="lockup">
              <img className="logo mc" src="/site/media/logo-mc.png" alt="Matthews / Clark"/>
            </div>

            <h2 className="event-date">
              Sunday <span className="blue">14<span className="scribble"></span></span> June
            </h2>

            <h3 className="event-title">The new shop <span className="blue">opens.</span></h3>

            <p className="event-lede">Year one done. The new floor is finished — twice the bays, two lifts, the lift bank we&apos;ve been waiting on. One night to see it before the cars start rolling in. Sam and Keanan on the floor all evening.</p>

            <div className="event-details">
              <div className="cell">
                <span className="k">— Where</span>
                <span className="v">The new floor<span className="sub">Woodstock, CPT</span></span>
              </div>
              <div className="cell">
                <span className="k">— From</span>
                <span className="v">17:00 onwards<span className="sub">Doors close late</span></span>
              </div>
              <div className="cell">
                <span className="k">— Who</span>
                <span className="v">Clients · Builders<span className="sub">The people who got us here</span></span>
              </div>
              <div className="cell">
                <span className="k">— Bring</span>
                <span className="v">The car<span className="sub">Parking on the block</span></span>
              </div>
            </div>

            <div className="event-actions">
              <a className="btn-rsvp" href="#book" data-book="">
                RSVP to launch
                <span className="arr">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </a>
              <a className="link-ghost" href="#">See past events →</a>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: FINAL CTA */}
      <section className="final-cta">
        <h2>Your car is evidence<br/>of what <span className="blue">you&apos;ve built.</span></h2>
        <p className="sub">Let&apos;s make sure it looks like it. One slot per car, per studio block — booked in person, finished in person.</p>
        <a className="btn-big" href="#book" data-book="">
          Book a Slot
          <span className="arr">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        </a>
      </section>

      {/* SECTION 8: LEAD FORM */}
      <section className="book" id="book">
        <div className="book-grid">
          <div className="left">
            <div className="label"><span className="num">07</span>Book a slot</div>
            <h2>Tell us about<br/>the car.<br/><span className="blue">We&apos;ll come back</span><br/>same day.</h2>
            <p>Four fields. Real reply from Sam or Keanan — not a chatbot. We reply within 24 hours, usually within the hour during studio hours.</p>
            <div className="mono-list">
              <div><span className="k">Studio</span> Woodstock, Cape Town</div>
              <div><span className="k">Hours</span> Mon–Fri 08h00–17h00</div>
              <div><span className="k">By appt</span> No drop-ins</div>
              <div><span className="k">Slots left</span> 3 this month</div>
            </div>
          </div>

          <form className="book-form" action="https://matthewsandclark.co.za" method="GET">
            <div className="field">
              <span className="ftag">01  Name<span className="req">*</span></span>
              <input type="text" name="name" placeholder="Your name" autoComplete="name" required/>
            </div>
            <div className="field">
              <span className="ftag">02  Phone<span className="req">*</span></span>
              <input type="tel" name="phone" placeholder="+27 …" autoComplete="tel" required/>
            </div>
            <div className="field">
              <span className="ftag">03  Car<span className="req">*</span></span>
              <div className="row2">
                <input type="text" name="make" placeholder="Make &amp; model" required/>
                <input type="text" name="year" placeholder="Year"/>
              </div>
            </div>
            <div className="field">
              <span className="ftag">04  What are you looking for?</span>
              <select name="service" required>
                <option value="" disabled>Choose a service…</option>
                <option>PPF</option>
                <option>Ceramic coating</option>
                <option>Wrap</option>
                <option>Paint correction</option>
                <option>Detailing</option>
                <option>Body kit / styling</option>
                <option>Wheels</option>
                <option>Starlight</option>
                <option>Not sure — let&apos;s talk</option>
              </select>
            </div>
            <div className="field">
              <span className="ftag">05  Anything else?</span>
              <textarea name="notes" rows="3" placeholder="Goal, deadline, anything we should know"></textarea>
            </div>
            <div className="consent">
              By submitting you accept the studio terms.<br/>
              We&apos;ll reply by phone or WhatsApp — never email-only.
            </div>
            <button className="submit-btn" type="submit">
              Book a Slot
              <span className="arr">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </button>
            <div className="sent-msg">
              <div className="mono">Sent  /  We&apos;ll be in touch</div>
              <div className="big">Thanks. Keep your phone close.</div>
            </div>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <h4>— Matthews &amp; Clark</h4>
            <p className="lede">Protection &amp; presence for the cars you&apos;ve worked for. Cape Town, by appointment.</p>
          </div>
          <div>
            <h4>Services</h4>
            <ul>
              <li><a href="/ppf">PPF</a></li>
              <li><a href="/ceramic">Ceramic</a></li>
              <li><a href="/wrapping">Wrap</a></li>
              <li><a href="/correction">Correction</a></li>
              <li><a href="/detailing">Detailing</a></li>
            </ul>
          </div>
          <div>
            <h4>Studio</h4>
            <ul>
              <li><a href="/about">About</a></li>
              <li><a href="#">The Log</a></li>
              <li><a href="/community">Community</a></li>
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
              <li>3 Muir Road, Woodstock</li>
              <li>By appointment only</li>
              <li>Mon–Fri 08–17</li>
              <li><a href="#book" data-book="">Book a slot →</a></li>
            </ul>
          </div>
        </div>
        <div className="wordmark-row">
          <div className="wordmark">M<span className="slash">/</span>C</div>
          <div className="legal">
            © 2026 Matthews &amp; Clark<br/>
            Cape Town, South Africa<br/>
            <a href="#">Terms</a>  ·  <a href="#">Privacy</a>
          </div>
        </div>
      </footer>

      <script dangerouslySetInnerHTML={{ __html: navScript }} />
    </>
  );
}
