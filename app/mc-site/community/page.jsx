export const metadata = {
  title: 'Community',
  description: 'The Cape Town car community. One event a month. Open to all.',
};

const pageCSS = `
  .comm-hero{padding:160px 0 64px;background:var(--black);position:relative;overflow:hidden}
  .comm-hero::before{
    content:'';position:absolute;left:50%;top:30%;transform:translateX(-50%);
    width:1400px;height:1400px;border-radius:999px;
    background:radial-gradient(circle, rgba(31,79,255,.10) 0%, transparent 55%);
    pointer-events:none;
  }
  .comm-hero .container{position:relative;z-index:2}
  .comm-hero .crumbs{
    font-family:var(--mono);font-size:11px;letter-spacing:.22em;
    text-transform:uppercase;color:rgba(255,255,255,.55);
    margin-bottom:28px;display:flex;gap:10px;align-items:center;
  }
  .comm-hero .crumbs .sep{color:rgba(255,255,255,.25)}
  .comm-hero .crumbs .here{color:var(--accent)}
  .comm-hero h1{
    font-family:var(--display);
    font-size:clamp(60px, 8vw, 140px);line-height:.9;letter-spacing:0;
    text-transform:uppercase;color:#fff;text-wrap:balance;
  }
  .comm-hero h1 .blue{color:var(--accent)}
  .comm-hero .sub{
    margin-top:28px;font-family:var(--body);font-size:clamp(17px, 1.4vw, 20px);
    line-height:1.6;color:rgba(255,255,255,.72);max-width:54ch;
  }
  .comm-hero .row{
    display:flex;align-items:flex-end;justify-content:space-between;gap:48px;
    margin-top:48px;flex-wrap:wrap;
  }
  .comm-hero .stats{
    display:flex;gap:48px;flex-wrap:wrap;
    font-family:var(--mono);font-size:11px;letter-spacing:.22em;
    text-transform:uppercase;color:rgba(255,255,255,.55);
  }
  .comm-hero .stats .stat .v{
    font-family:var(--display);font-size:48px;line-height:1;
    color:#fff;letter-spacing:.005em;margin-bottom:8px;
  }
  .comm-hero .stats .stat .v .blue{color:var(--accent)}

  .next-event{
    padding:120px 0;background:var(--black);
    border-top:1px solid rgba(255,255,255,.06);
    position:relative;overflow:hidden;
  }
  .next-event::before{
    content:'';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    width:1200px;height:1200px;border-radius:999px;
    background:radial-gradient(circle, rgba(31,79,255,.08), transparent 60%);
    pointer-events:none;
  }
  .next-event .container{position:relative;z-index:2}
  .ne-grid{
    display:grid;grid-template-columns:1fr 1.05fr;gap:80px;align-items:center;
  }
  @media (max-width: 760px){.ne-grid{grid-template-columns:1fr;gap:48px}}
  .ne-date{position:relative;display:flex;flex-direction:column;align-items:flex-start}
  .ne-date .label{
    font-family:var(--mono);font-size:11px;letter-spacing:.22em;
    text-transform:uppercase;color:var(--accent);margin-bottom:18px;
    display:inline-flex;align-items:center;gap:10px;
    padding:6px 10px;border:1px solid rgba(31,79,255,.4);background:rgba(31,79,255,.08);
    border-radius:999px;
  }
  .ne-date .label .dot{width:6px;height:6px;border-radius:999px;background:var(--accent);animation:pulseDot 2.2s ease-in-out infinite}
  .ne-date .day-label{
    font-family:var(--display);font-size:48px;line-height:1;letter-spacing:.005em;
    text-transform:uppercase;color:rgba(255,255,255,.45);
  }
  .ne-date .day-number{
    font-family:var(--display);
    font-size:clamp(200px, 22vw, 320px);line-height:.85;letter-spacing:-.005em;
    text-transform:uppercase;color:#fff;position:relative;
    margin:8px 0;
  }
  .ne-date .day-number .underline{
    position:absolute;left:0;right:24%;bottom:18px;height:14px;
    background:var(--accent);opacity:.25;
    transform:skew(-12deg);z-index:-1;
  }
  .ne-date .day-number .blue{color:var(--accent);position:relative}
  .ne-date .month{
    font-family:var(--display);font-size:88px;line-height:1;letter-spacing:.005em;
    text-transform:uppercase;color:var(--accent);
  }
  .ne-body{padding-top:8px}
  .ne-body .eyebrow{
    display:inline-flex;align-items:center;gap:10px;
    font-family:var(--mono);font-size:11px;letter-spacing:.22em;
    text-transform:uppercase;color:rgba(255,255,255,.65);
    padding:6px 11px;border:1px solid rgba(255,255,255,.16);border-radius:999px;
    margin-bottom:24px;
  }
  .ne-body h2{
    font-family:var(--display);font-size:clamp(56px, 6vw, 88px);line-height:.92;letter-spacing:0;
    text-transform:uppercase;color:#fff;text-wrap:balance;
  }
  .ne-body h2 .blue{color:var(--accent)}
  .ne-body h2 .slash{color:var(--accent);margin:0 -.02em}
  .ne-body .lede{
    margin-top:24px;font-family:var(--body);font-size:17px;line-height:1.6;
    color:rgba(255,255,255,.7);max-width:42ch;
  }
  .ne-body .details{
    margin-top:32px;
    display:grid;grid-template-columns:1fr 1fr;gap:0;
    border-top:1px dashed rgba(255,255,255,.18);
    border-bottom:1px dashed rgba(255,255,255,.18);
  }
  .ne-body .details .cell{
    padding:18px 0;
    border-right:1px dashed rgba(255,255,255,.12);
  }
  .ne-body .details .cell:nth-child(odd){padding-right:18px}
  .ne-body .details .cell:nth-child(even){padding-left:18px;border-right:0}
  .ne-body .details .k{
    font-family:var(--mono);font-size:10px;letter-spacing:.22em;
    text-transform:uppercase;color:rgba(255,255,255,.45);
  }
  .ne-body .details .v{
    font-family:var(--headline);font-weight:700;font-size:16px;
    color:#fff;line-height:1.3;margin-top:6px;
  }
  .ne-body .actions{display:flex;gap:18px;flex-wrap:wrap;margin-top:32px}
  .ne-body .btn-rsvp{
    display:inline-flex;align-items:center;gap:12px;
    height:54px;padding:0 24px;border-radius:4px;background:var(--accent);color:#fff;
    font-family:var(--headline);font-weight:700;font-size:15px;
    transition:background .15s ease;
  }
  .ne-body .btn-rsvp:hover{background:var(--accent-bright)}
  .ne-body .btn-rsvp .arr{
    display:grid;place-items:center;width:28px;height:28px;border-radius:999px;background:rgba(255,255,255,.18);
  }

  .past{padding:120px 0;background:var(--black);border-top:1px solid rgba(255,255,255,.04)}
  .past-list{display:flex;flex-direction:column;border-top:1px solid rgba(255,255,255,.08)}
  .past-row{
    display:grid;grid-template-columns:80px 140px 1fr auto;gap:24px;align-items:center;
    padding:24px 0;
    border-bottom:1px solid rgba(255,255,255,.08);
    transition:padding .2s ease, background .2s ease;
  }
  .past-row:hover{padding-left:8px;background:rgba(255,255,255,.015)}
  @media (max-width: 760px){
    .past-row{grid-template-columns:60px 1fr;gap:14px;padding:18px 0}
    .past-row .when{grid-column:2;font-size:10px}
    .past-row h4{grid-column:2;font-size:18px}
    .past-row .meta-tags{display:none}
    .past-row .arrow{grid-column:2;justify-self:end}
  }
  .past-row .ix{
    font-family:var(--mono);font-size:11px;letter-spacing:.22em;color:rgba(255,255,255,.45);
  }
  .past-row .when{
    font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;
    color:#fff;font-weight:500;
  }
  .past-row h4{
    font-family:var(--display);font-size:24px;line-height:1.05;letter-spacing:.005em;
    text-transform:uppercase;color:#fff;
  }
  .past-row .meta-tags{
    display:flex;gap:6px;flex-wrap:wrap;
  }
  .past-row .meta-tags span{
    font-family:var(--mono);font-size:10px;letter-spacing:.18em;
    text-transform:uppercase;color:rgba(255,255,255,.55);
    padding:4px 10px;border:1px solid rgba(255,255,255,.14);border-radius:999px;
  }
  .past-row .arrow{
    width:36px;height:36px;border-radius:999px;
    border:1px solid rgba(255,255,255,.16);
    display:grid;place-items:center;color:#fff;
    transition:background .2s ease;
  }
  .past-row:hover .arrow{background:var(--accent);border-color:var(--accent)}

  .follow{
    padding:96px 0;background:var(--black);border-top:1px solid rgba(255,255,255,.04);
    text-align:center;
  }
  .follow .label{
    font-family:var(--mono);font-size:11px;letter-spacing:.22em;
    text-transform:uppercase;color:rgba(255,255,255,.5);
  }
  .follow h2{
    font-family:var(--display);font-size:clamp(48px, 6vw, 88px);line-height:.95;
    text-transform:uppercase;color:#fff;margin-top:18px;text-wrap:balance;
  }
  .follow h2 .blue{color:var(--accent)}
  .follow .actions{
    display:flex;gap:14px;justify-content:center;margin-top:36px;flex-wrap:wrap;
  }
  .follow .actions a{
    display:inline-flex;align-items:center;gap:10px;
    height:54px;padding:0 26px;border-radius:4px;
    border:1px solid rgba(255,255,255,.18);color:#fff;
    font-family:var(--headline);font-weight:700;font-size:14px;letter-spacing:.04em;
    transition:border-color .2s ease, background .2s ease;
  }
  .follow .actions a:hover{border-color:var(--accent);background:rgba(31,79,255,.08)}
  .follow .actions a .ix{font-family:var(--mono);font-size:11px;color:rgba(255,255,255,.4)}
`;

export default function CommunityPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='community';` }} />
      <style dangerouslySetInnerHTML={{ __html: pageCSS }} />
      <header data-mc-nav=""></header>

      <section className="comm-hero">
        <div className="container">
          <div className="crumbs">
            <a href="/">Home</a><span className="sep">/</span>
            <span className="here">Community</span>
          </div>
          <h1>The Cape Town<br/>car community.<br/><span className="blue">We run the scene.</span></h1>
          <p className="sub">One event a month. Open to anyone who can find the address. We don&apos;t sponsor the meet — we cook for it, run it, and lock up after.</p>
          <div className="row">
            <div className="stats">
              <div className="stat">
                <div className="v">12<span className="blue">/yr</span></div>
                <div>Events / year</div>
              </div>
              <div className="stat">
                <div className="v">~80</div>
                <div>Avg cars / event</div>
              </div>
              <div className="stat">
                <div className="v">2019</div>
                <div>First meet</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="next-event">
        <div className="container">
          <div className="sec-h">
            <span className="label">
              <span className="num">02</span><span>Next event</span>
              <span className="div"></span>
              <span className="sub">Opening night · One night only</span>
            </span>
          </div>
          <div className="ne-grid">
            <div className="ne-date">
              <span className="label"><span className="dot"></span>RSVPs open</span>
              <span className="day-label">Sunday</span>
              <span className="day-number"><span className="blue">14<span className="underline"></span></span></span>
              <span className="month">June</span>
            </div>
            <div className="ne-body">
              <span className="eyebrow">— No.05 / 2026 · Opening night</span>
              <h2>The new floor <span className="blue">launch.</span></h2>
              <p className="lede">Year one done. The new floor is finished — twice the bays, the new studio next door, the lift bank we&apos;ve been waiting on. One night to see it before the cars start rolling in. Sam and Keanan on the floor all evening.</p>
              <div className="details">
                <div className="cell">
                  <div className="k">— Where</div>
                  <div className="v">The new floor<br/>Woodstock, Cape Town</div>
                </div>
                <div className="cell">
                  <div className="k">— From</div>
                  <div className="v">17:00 onwards<br/>Doors close late</div>
                </div>
                <div className="cell">
                  <div className="k">— Who</div>
                  <div className="v">Clients, builders<br/>The people who got us here</div>
                </div>
                <div className="cell">
                  <div className="k">— Bring</div>
                  <div className="v">The car<br/>(parking on the block)</div>
                </div>
              </div>
              <div className="actions">
                <a className="btn-rsvp" href="#book" data-book="">
                  RSVP to launch
                  <span className="arr"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="past">
        <div className="container">
          <div className="sec-h">
            <span className="label">
              <span className="num">03</span><span>Past events</span>
              <span className="div"></span>
              <span className="sub">The reel, not the recap</span>
            </span>
            <a className="see-all" href="#">
              See all events
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </div>
          <div className="past-list">
            <a className="past-row" href="#">
              <span className="ix">04</span>
              <span className="when">May 2026</span>
              <h4>Sea Point Sundown Run</h4>
              <div className="meta-tags"><span>62 cars</span><span>Open run</span><span>Sundowner</span></div>
              <span className="arrow">→</span>
            </a>
            <a className="past-row" href="#">
              <span className="ix">03</span>
              <span className="when">Apr 2026</span>
              <h4>Cape Point Coffee Run</h4>
              <div className="meta-tags"><span>74 cars</span><span>Convoy</span><span>Coffee &amp; pastel</span></div>
              <span className="arrow">→</span>
            </a>
            <a className="past-row" href="#">
              <span className="ix">02</span>
              <span className="when">Mar 2026</span>
              <h4>Studio Park-Off</h4>
              <div className="meta-tags"><span>91 cars</span><span>Park-off</span><span>Workshop tour</span></div>
              <span className="arrow">→</span>
            </a>
            <a className="past-row" href="#">
              <span className="ix">01</span>
              <span className="when">Feb 2026</span>
              <h4>Franschhoek Mountain Run</h4>
              <div className="meta-tags"><span>48 cars</span><span>Day run</span><span>Lunch</span></div>
              <span className="arrow">→</span>
            </a>
          </div>
        </div>
      </section>

      <section className="follow">
        <div className="container">
          <div className="label">— Stay in the loop</div>
          <h2>The meet is on <span className="blue">Instagram</span><br/>before it&apos;s on the calendar.</h2>
          <div className="actions">
            <a href="#"><span className="ix">01</span> Instagram <span>↗</span></a>
            <a href="#"><span className="ix">02</span> TikTok <span>↗</span></a>
            <a href="https://wa.me/27828477701"><span className="ix">03</span> WhatsApp list <span>↗</span></a>
          </div>
        </div>
      </section>

      <section className="final-cta" id="book">
        <h2>Come through.<br/><span className="blue">Bring the car.</span></h2>
        <p className="sub">RSVP for the next event — same form as a booking. We get all of it in one inbox.</p>
        <a className="btn-big" href="https://matthewsandclark.co.za">RSVP / Book a Slot <span className="arr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
      </section>

      <footer data-mc-footer=""></footer>
    </>
  );
}
