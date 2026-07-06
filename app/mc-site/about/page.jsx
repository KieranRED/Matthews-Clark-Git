export const metadata = {
  title: 'About',
  description: 'Kieran Redpath, Sam Clark and Keanan Matthews. Cape Town automotive protection and customisation, in partnership with Izimoto. By appointment only.',
  alternates: { canonical: 'https://www.matthewsandclark.co.za/mc-site/about' },
  openGraph: {
    title: 'About — Matthews / Clark Cape Town',
    description: 'Kieran Redpath, Sam Clark and Keanan Matthews. Cape Town automotive protection and customisation, in partnership with Izimoto. By appointment only.',
    url: 'https://www.matthewsandclark.co.za/mc-site/about',
  },
  twitter: {
    title: 'About — Matthews / Clark Cape Town',
    description: 'Kieran Redpath, Sam Clark and Keanan Matthews. Cape Town automotive protection and customisation, in partnership with Izimoto. By appointment only.',
  },
};

const pageCSS = `
  .about-hero{position:relative;height:auto;min-height:680px;overflow:hidden;background:#000;}
  .about-hero .img{position:absolute;inset:0}
  .about-hero .img img{width:100%;height:100%;object-fit:cover;display:block;filter:contrast(1.03) saturate(.95)}
  .about-hero .scrim{position:absolute;inset:0;background:linear-gradient(to top, rgba(13,13,13,.95) 0%, rgba(13,13,13,.45) 50%, rgba(13,13,13,.55) 100%)}
  .about-hero .stamp{position:absolute;left:24px;top:120px;font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#fff;padding:6px 10px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.18);z-index:3;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}
  .about-hero .content{position:relative;z-index:3;min-height:680px;display:flex;flex-direction:column;justify-content:flex-end;padding:140px 0 64px;}
  .about-hero .crumbs{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-bottom:24px;display:flex;gap:10px;align-items:center;}
  .about-hero .crumbs .sep{color:rgba(255,255,255,.25)}
  .about-hero .crumbs .here{color:var(--accent)}
  .about-hero h1{font-family:var(--display);font-size:clamp(56px, 8vw, 140px);line-height:.9;letter-spacing:0;text-transform:uppercase;color:#fff;text-wrap:balance;}
  .about-hero h1 .blue{color:var(--accent)}
  .about-hero .sub{margin-top:24px;font-family:var(--body);font-size:18px;line-height:1.6;color:rgba(255,255,255,.78);max-width:44ch;}
  .about-body{padding:120px 0;background:var(--black)}
  .about-body .container{display:grid;grid-template-columns:1.6fr 1fr;gap:96px;align-items:start}
  @media (max-width: 760px){.about-body{padding:64px 0}.about-body .container{grid-template-columns:1fr;gap:40px}}
  .about-body .copy .label{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:28px;}
  .about-body .copy .label .num{color:var(--accent);margin-right:8px;font-weight:500}
  .about-body .copy p{font-family:var(--body);font-size:18px;line-height:1.7;color:rgba(255,255,255,.8);max-width:54ch;}
  .about-body .copy p + p{margin-top:20px}
  .about-body .copy p strong{color:#fff;font-weight:500}
  .about-body .photo{position:relative;aspect-ratio:4/5;background:#111;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.06);}
  .about-body .photo::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 40% 60%, rgba(31,79,255,.16), transparent 60%),linear-gradient(165deg, #1d1d1d 0%, #060606 100%);}
  .about-body .photo .stamp{position:absolute;left:18px;top:16px;font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.4);}
  .about-body .photo .quote{position:absolute;left:24px;right:24px;bottom:24px;font-family:var(--display);font-size:32px;line-height:.95;letter-spacing:.005em;text-transform:uppercase;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5);}
  .about-body .photo .quote .blue{color:var(--accent)}
  .founders{padding:32px 0 120px;background:var(--black);border-top:1px solid rgba(255,255,255,.06);}
  .founders .container{padding-top:96px}
  .founder-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;margin-top:48px}
  @media (max-width: 1000px){.founder-grid{grid-template-columns:1fr 1fr}}
  @media (max-width: 760px){.founder-grid{grid-template-columns:1fr;gap:24px}}
  .founder-card{display:flex;flex-direction:column;gap:24px;padding:32px;background:var(--grey-dark);border:1px solid var(--border);border-radius:12px;}
  .founder-card .photo{aspect-ratio:4/5;background:#111;overflow:hidden;position:relative;border-radius:8px;}
  .founder-card .photo::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%, rgba(31,79,255,.14), transparent 60%),linear-gradient(160deg, #2a2a2a 0%, #050505 100%);}
  .founder-card .photo .stamp{position:absolute;left:16px;top:14px;font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.4);}
  .founder-card .body .role{font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);margin-bottom:14px;}
  .founder-card .body h3{font-family:var(--display);font-size:48px;line-height:.95;letter-spacing:.005em;text-transform:uppercase;color:#fff;}
  .founder-card .body p{margin-top:16px;font-family:var(--body);font-size:16px;line-height:1.6;color:rgba(255,255,255,.7);}
  .founder-card .body .meta{margin-top:24px;padding-top:18px;border-top:1px dashed rgba(255,255,255,.12);display:grid;grid-template-columns:1fr 1fr;gap:16px;font-family:var(--mono);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5);}
  .founder-card .body .meta .v{color:#fff;font-weight:500;font-family:var(--headline)}
  .garage-strip{background:var(--black);border-top:1px solid rgba(255,255,255,.06);padding:96px 0;}
  .garage-strip .container{display:grid;grid-template-columns:1fr 1fr;gap:96px;align-items:end}
  @media (max-width: 760px){.garage-strip{padding:48px 0}.garage-strip .container{grid-template-columns:1fr;gap:32px}}
  .garage-strip h2{font-family:var(--display);font-size:clamp(48px, 5.5vw, 80px);line-height:.95;letter-spacing:0;text-transform:uppercase;color:#fff;text-wrap:balance;}
  .garage-strip h2 .blue{color:var(--accent)}
  .garage-strip .lede{margin-top:24px;font-family:var(--body);font-size:17px;line-height:1.65;color:rgba(255,255,255,.7);max-width:46ch;}
  .garage-strip .stats{display:grid;grid-template-columns:repeat(2, 1fr);gap:0;border-top:1px dashed rgba(255,255,255,.18);border-bottom:1px dashed rgba(255,255,255,.18);}
  .garage-strip .stats .c{padding:22px 0;border-right:1px dashed rgba(255,255,255,.12);}
  .garage-strip .stats .c:nth-child(odd){padding-right:24px}
  .garage-strip .stats .c:nth-child(even){padding-left:24px;border-right:0}
  .garage-strip .stats .k{font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.45);}
  .garage-strip .stats .v{font-family:var(--display);font-size:54px;line-height:1;letter-spacing:.005em;text-transform:uppercase;color:#fff;margin-top:6px;}
  .garage-strip .stats .v .blue{color:var(--accent)}
`;

export default function AboutPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='about';` }} />
      <style>{pageCSS}</style>

      <header data-mc-nav=""></header>

      <section className="about-hero">
        <div className="img"><img src="/site/media/garage.jpg" alt="Matthews &amp; Clark garage, Woodstock, Cape Town" /></div>
        <div className="scrim"></div>
        <span className="stamp">PHOTO  /  STUDIO  /  WOODSTOCK CPT</span>
        <div className="container">
          <div className="content">
            <div className="crumbs">
              <a href="/mc-site">Home</a><span className="sep">/</span>
              <span className="here">About</span>
            </div>
            <h1>Two guys.<br/>One garage.<br/><span className="blue">Too many cars.</span></h1>
            <p className="sub">Sam &amp; Keanan. On every job. Named on the booking. On camera. In the room when you collect.</p>
          </div>
        </div>
      </section>

      <section className="about-body">
        <div className="container">
          <div className="copy">
            <div className="label"><span className="num">02</span>The story</div>
            <p>Matthews &amp; Clark started as the thing Keanan and Sam were already doing — <strong>detailing cars properly, being honest about it</strong>, and building something in Cape Town that felt like theirs.</p>
            <p>The garage is Keanan&apos;s family collection space. The Rolls is there. The Ferraris are there. The Alfa 4C is there. Every car that comes in for a service gets treated the same way — like it matters to the person who owns it, because it always does.</p>
            <p>Sam runs the process. Keanan makes it entertaining. The work speaks for itself.</p>
            <p>We&apos;re not the biggest detailer in Cape Town. <strong>We&apos;re not trying to be.</strong> We&apos;re trying to be the one people remember — because the car left better than it came in, and because nobody was made to feel like a customer about it.</p>
          </div>
          <div className="photo">
            <span className="stamp">PHOTO  /  SAM + KEANAN</span>
            <div className="quote">Two of us<br/><span className="blue">on every</span> job.</div>
          </div>
        </div>
      </section>

      <section className="founders" id="team">
        <div className="container">
          <div className="sec-h">
            <span className="label">
              <span className="num">03</span><span>The team</span>
              <span className="div"></span>
              <span className="sub">Three founders. Two of them on every job.</span>
            </span>
          </div>
          <div className="founder-grid">
            <div className="founder-card">
              <div className="photo"><span className="stamp">PHOTO  /  KEANAN</span></div>
              <div className="body">
                <div className="role">Co-founder · Lead detailer</div>
                <h3>Keanan Matthews</h3>
                <p>Will tell you exactly what&apos;s wrong with your paint to your face. Then fix it. The voice in front of the lens.</p>
                <div className="meta">
                  <div><div>On every</div><div className="v">PPF · Ceramic</div></div>
                  <div><div>Studio years</div><div className="v">07</div></div>
                </div>
              </div>
            </div>
            <div className="founder-card">
              <div className="photo"><span className="stamp">PHOTO  /  SAM</span></div>
              <div className="body">
                <div className="role">Co-founder · Studio lead</div>
                <h3>Sam Clark</h3>
                <p>Running the process while Keanan&apos;s talking. The reason every job ends on the day we said it would.</p>
                <div className="meta">
                  <div><div>On every</div><div className="v">Correction · Wrap</div></div>
                  <div><div>Studio years</div><div className="v">07</div></div>
                </div>
              </div>
            </div>
            <div className="founder-card">
              <div className="photo"><span className="stamp">PHOTO  /  KIERAN</span></div>
              <div className="body">
                <div className="role">Co-founder · Product &amp; systems</div>
                <h3>Kieran Redpath</h3>
                <p>Builds the booking, the quotes, the whole way this runs online. If you dealt with M&amp;C before you met Sam or Keanan in person, this is why.</p>
                <div className="meta">
                  <div><div>On every</div><div className="v">Booking · Site</div></div>
                  <div><div>Founded</div><div className="v">2019</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="garage-strip">
        <div className="container">
          <div>
            <h2>The new floor.<br/><span className="blue">Twice the bays.</span></h2>
            <p className="lede">Year one in the old shop is done. The new floor in Woodstock is finished — six bays, two lifts, the Izimoto build room next door. Same two guys. Same standard. More room to work.</p>
            <a className="link-arrow" href="/mc-site/community" style={{marginTop:'32px'}}>Come see it — RSVP to the launch
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </div>
          <div className="stats">
            <div className="c"><div className="k">Bays</div><div className="v"><span className="blue">06</span></div></div>
            <div className="c"><div className="k">Lifts</div><div className="v">02</div></div>
            <div className="c"><div className="k">Founded</div><div className="v">2019</div></div>
            <div className="c"><div className="k">Cars / year</div><div className="v">~180</div></div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="book">
        <h2>Come meet us.<br/><span className="blue">Book a slot.</span></h2>
        <p className="sub">In-person handover, every time. Drop in for coffee on a launch night, or send the car for the day.</p>
        <a className="btn-big" href="https://matthewsandclark.co.za">
          Book a Slot
          <span className="arr">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        </a>
      </section>

      <footer data-mc-footer=""></footer>
    </>
  );
}
