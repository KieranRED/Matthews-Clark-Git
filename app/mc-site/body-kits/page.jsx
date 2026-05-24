export const metadata = {
  title: 'Body Kits',
  description: 'Matthews & Clark imports and fits widebody, OEM+ and aero body kits in Cape Town. Sourcing, importing and fitment done in-house.',
};

const baScript = `
(() => {
  const frame = document.getElementById('baFrame');
  const handle = document.getElementById('baHandle');
  if (!frame || !handle) return;
  const before = frame.querySelector('.before');
  let dragging = false;
  const setPosition = (pct) => { pct = Math.max(2, Math.min(98, pct)); handle.style.left = pct + '%'; before.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)'; };
  const moveTo = (clientX) => { const rect = frame.getBoundingClientRect(); setPosition(((clientX - rect.left) / rect.width) * 100); };
  const onDown = (e) => { dragging = true; frame.style.cursor='ew-resize'; e.preventDefault(); };
  const onUp = () => { dragging = false; frame.style.cursor=''; };
  const onMove = (e) => { if (!dragging) return; const x = e.touches ? e.touches[0].clientX : e.clientX; moveTo(x); };
  frame.addEventListener('click', (e) => { if (e.target.closest('.knob')) return; moveTo(e.clientX); });
  handle.addEventListener('mousedown', onDown);
  handle.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchend', onUp);
  setPosition(50);
})();
`;

export default function BodyKitsPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='body-kits';` }} />
      <header data-mc-nav=""></header>

      <section className="svc-hero">
        <div className="img"></div>
        <div className="scrim"></div>
        <span className="stamp">PHOTO  /  BODYKIT  /  BUILD</span>
        <div className="container">
          <div className="content">
            <div className="crumbs">
              <a href="/">Home</a><span className="sep">/</span>
              <a href="/services">Services</a><span className="sep">/</span>
              <span className="here">Body Kits</span>
            </div>
            <h1>Body Kit Imports <span className="blue">&amp; fitting.</span></h1>
            <div className="last-updated">Last updated <span className="b">May 2026</span> · By project</div>
            <div className="actions">
              <a className="btn-primary" href="#book" data-book="">Book a Slot <span className="arr"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
              <a className="btn-ghost" href="#process">See the process →</a>
            </div>
          </div>
        </div>
      </section>

      <section className="svc-intro">
        <div className="container">
          <div className="label"><span className="num">02</span>What it is</div>
          <p>Matthews &amp; Clark sources and installs imported body kits in Cape Town. We import widebody conversion kits, OEM+ aero packages, front splitters, rear diffusers, and full body conversion kits for a wide range of vehicles. Fitment is handled in-house. We work with verified overseas suppliers and advise on fitment compatibility before ordering.</p>
        </div>
      </section>

      <section className="svc-explainer">
        <div className="container">
          <div className="copy">
            <p>Importing a body kit isn&apos;t complicated until it is. Wrong supplier, wrong fitment, panels that don&apos;t align. We&apos;ve done this enough to know which suppliers are worth the money and which ones aren&apos;t.</p>
            <p>We source. We import. We fit. You collect the car looking the way you planned it.</p>
            <p>Most body-kit builds end with <a href="/ppf" style={{color:'var(--accent)'}}>PPF</a> or a <a href="/wrapping" style={{color:'var(--accent)'}}>wrap</a> in the studio — and the right <a href="/wheels" style={{color:'var(--accent)'}}>wheels</a> underneath. Plan it as one project, not three.</p>
            <a className="link-arrow" href="#book" data-book="">Get a quote on your car <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
          </div>
          <div className="photo"><span className="stamp">PHOTO  /  BODYKIT  /  STUDIO</span></div>
        </div>
      </section>

      <section className="svc-options">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">03</span><span>How we do it</span></span></div>
          <div style={{background:'var(--grey-dark)',border:'1px solid var(--border)',borderRadius:'12px',padding:'48px',maxWidth:'760px'}}>
            <p style={{fontFamily:'var(--display)',fontSize:'32px',lineHeight:'1.05',letterSpacing:'.005em',textTransform:'uppercase',color:'#fff',textWrap:'balance'}}>Tell us what you&apos;re building. We&apos;ll advise on what&apos;s available and what makes sense for your car.</p>
          </div>
        </div>
      </section>

      <section className="svc-ba">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">04</span><span>Before / after</span><span className="div"></span><span className="sub">Drag the handle</span></span></div>
          <div className="ba-frame" id="baFrame">
            <div className="layer after"></div><div className="layer before"></div>
            <div className="pill before-l">Before</div><div className="pill after-l">After</div>
            <div className="handle" id="baHandle"><div className="knob" aria-label="Drag to compare"></div></div>
            <div className="stamp">PHOTO  /  REPLACE WITH BEFORE-AFTER</div>
          </div>
        </div>
      </section>

      <section className="svc-process" id="process">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">05</span><span>How it works</span><span className="div"></span><span className="sub">By project</span></span></div>
          <div className="proc-grid">
            <div className="proc-step"><span className="num">01</span><h4>Consultation</h4><p>Tell us the car, the vision. We advise on available kits and fitment compatibility.</p></div>
            <div className="proc-step"><span className="num">02</span><h4>Sourcing</h4><p>We confirm the right kit from a verified supplier. Lead times vary.</p></div>
            <div className="proc-step"><span className="num">03</span><h4>Import &amp; inspection</h4><p>Kit arrives, we inspect it before anything gets fitted.</p></div>
            <div className="proc-step"><span className="num">04</span><h4>Fitment</h4><p>Installed and adjusted in-workshop. We don&apos;t hand you panels and send you away.</p></div>
          </div>
        </div>
      </section>

      <section className="svc-related">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">06</span><span>Pair it with</span></span></div>
          <div className="rel-grid">
            <a className="rel-card" href="/wheels"><div className="left"><span className="k">Presence</span><span className="n">Custom Wheels</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/ppf"><div className="left"><span className="k">Protection</span><span className="n">PPF</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/wrapping"><div className="left"><span className="k">Presence</span><span className="n">Wrapping</span></div><span className="arr">→</span></a>
          </div>
        </div>
      </section>

      <section className="svc-faq">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">07</span><span>FAQ</span></span></div>
          <div className="faq-grid">
            <div className="left"><h2>What people <span className="blue">ask us.</span></h2><p className="copy">If your question isn&apos;t here, drop it in the booking form. We answer them properly.</p></div>
            <div className="faq-list">
              <details className="faq"><summary>Which cars can you source body kits for?<span className="icon">+</span></summary><div className="answer"><p>Most popular platforms. European and Japanese primarily. Tell us what you&apos;re building.</p></div></details>
              <details className="faq"><summary>How long does import take?<span className="icon">+</span></summary><div className="answer"><p>Lead times vary by supplier and destination. Typically 3–6 weeks. We&apos;ll confirm before you commit.</p></div></details>
              <details className="faq"><summary>Can you fit kits I&apos;ve already bought?<span className="icon">+</span></summary><div className="answer"><p>Yes. If you&apos;ve sourced a kit and need it fitted properly, we can do that.</p></div></details>
              <details className="faq"><summary>Do you paint-match the kit?<span className="icon">+</span></summary><div className="answer"><p>We can arrange paint matching. Discuss at consultation.</p></div></details>
              <details className="faq"><summary>What&apos;s the difference between a widebody kit and a regular body kit?<span className="icon">+</span></summary><div className="answer"><p>A widebody kit flares the arches to accommodate wider wheels and tyres. A standard kit adds aero and styling elements without altering the arch width. Different purpose, different budget.</p></div></details>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="book">
        <h2>Tell us what <span className="blue">you&apos;re building.</span></h2>
        <p className="sub">Vision, reference photos, current setup — anything. We&apos;ll come back with what&apos;s realistic.</p>
        <a className="btn-big" href="https://matthewsandclark.co.za">Book a Slot <span className="arr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
      </section>

      <footer data-mc-footer=""></footer>
      <script dangerouslySetInnerHTML={{ __html: baScript }} />
    </>
  );
}
