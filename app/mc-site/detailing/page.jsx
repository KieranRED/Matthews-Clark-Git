export const metadata = {
  title: 'Car Detailing',
  description: 'Matthews & Clark offers full car detailing in Cape Town — interior, exterior, wheels and glass. Often combined with ceramic, PPF or correction.',
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

export default function DetailingPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='detailing';` }} />
      <header data-mc-nav=""></header>

      <section className="svc-hero">
        <div className="img"></div>
        <div className="scrim"></div>
        <span className="stamp">PHOTO  /  DETAILING  /  STUDIO</span>
        <div className="container">
          <div className="content">
            <div className="crumbs">
              <a href="/">Home</a><span className="sep">/</span>
              <a href="/services">Services</a><span className="sep">/</span>
              <span className="here">Detailing</span>
            </div>
            <h1>Car Detailing <span className="blue">in Cape Town.</span></h1>
            <div className="last-updated">Last updated <span className="b">May 2026</span> · 1–5 days</div>
            <div className="actions">
              <a className="btn-primary" href="#book" data-book="">Book a Slot <span className="arr"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
            </div>
          </div>
        </div>
      </section>

      <section className="svc-intro">
        <div className="container">
          <div className="label"><span className="num">02</span>What it is</div>
          <p>Matthews &amp; Clark offers car detailing and valeting in Cape Town. Services include full exterior wash, interior deep clean, wheel detailing, and window treatment. Detailing packages can be combined with ceramic coating, paint correction, and PPF as part of the same visit. Most detailing runs alongside other services in the workshop.</p>
        </div>
      </section>

      <section className="svc-explainer">
        <div className="container">
          <div className="copy">
            <p>A proper detail isn&apos;t a car wash. It&apos;s a full inspection and clean of every surface — paint, glass, interior, wheels, jams and trim. Done before a ceramic, before PPF, or on its own.</p>
            <p>Most of our detailing clients come in for a <a href="/ceramic" style={{color:'var(--accent)'}}>ceramic</a> or <a href="/correction" style={{color:'var(--accent)'}}>correction</a> — the detail is part of the package, not a standalone. But if your car just needs a proper clean done properly, we can sort that too.</p>
            <a className="link-arrow" href="#book" data-book="">Get a quote on your car <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
          </div>
          <div className="photo"><span className="stamp">PHOTO  /  DETAILING  /  STUDIO</span></div>
        </div>
      </section>

      <section className="svc-options">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">03</span><span>Options</span><span className="div"></span><span className="sub">Pick the right one for your car</span></span></div>
          <div className="opts-grid">
            <div className="opt-card"><div className="name">Full Valet<span className="price">1 day</span></div><p className="desc">Exterior wash, interior detail, deep-cleaned wheels.</p><ul><li>Exterior strip wash</li><li>Interior deep clean</li><li>Wheel detailing</li></ul></div>
            <div className="opt-card"><div className="name">Window Ceramic<span className="price">1 day</span></div><p className="desc">Add water-shedding to your glass.</p><ul><li>2× exterior wash</li><li>Window ceramic coating</li><li>Deep-cleaned wheels</li></ul></div>
            <div className="opt-card tier"><div className="name">Gold<span className="price">2–3 days</span></div><p className="desc">Detail + 1.5-yr ceramic.</p><ul><li>Strip wash</li><li>Interior valet</li><li>1-step polish</li><li>1.5-yr ceramic</li></ul></div>
            <div className="opt-card tier"><div className="name">Platinum<span className="price">3–4 days</span></div><p className="desc">Detail + 3-yr ceramic + windows.</p><ul><li>Strip wash</li><li>Interior valet</li><li>1-step polish</li><li>3-yr ceramic</li><li>Window ceramic</li></ul></div>
            <div className="opt-card tier"><div className="name">Diamond<span className="price">4–5 days</span></div><p className="desc">The full lock-in.</p><ul><li>Strip wash</li><li>Interior valet</li><li>2-step polish</li><li>5-yr ceramic</li><li>Window ceramic + jams</li></ul></div>
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

      <section className="svc-related">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">06</span><span>Pair it with</span></span></div>
          <div className="rel-grid">
            <a className="rel-card" href="/ceramic"><div className="left"><span className="k">Protection</span><span className="n">Ceramic</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/correction"><div className="left"><span className="k">Restoration</span><span className="n">Paint Correction</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/ppf"><div className="left"><span className="k">Protection</span><span className="n">PPF</span></div><span className="arr">→</span></a>
          </div>
        </div>
      </section>

      <section className="svc-faq">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">07</span><span>FAQ</span></span></div>
          <div className="faq-grid">
            <div className="left"><h2>What people <span className="blue">ask us.</span></h2><p className="copy">If your question isn&apos;t here, drop it in the booking form. We answer them properly.</p></div>
            <div className="faq-list">
              <details className="faq"><summary>How long does a full detail take?<span className="icon">+</span></summary><div className="answer"><p>A standalone full valet takes a day. Package services take 2–5 days depending on the work involved.</p></div></details>
              <details className="faq"><summary>Do you detail supercars?<span className="icon">+</span></summary><div className="answer"><p>Yes. We&apos;ve detailed Ferraris, Rolls Royces, Lamborghinis and Porsches. Every car gets the same attention.</p></div></details>
              <details className="faq"><summary>Can I combine detailing with other services?<span className="icon">+</span></summary><div className="answer"><p>Yes — most clients combine a full detail with ceramic coating, paint correction or PPF in the same workshop visit.</p></div></details>
              <details className="faq"><summary>What&apos;s the difference between a valet and a detail?<span className="icon">+</span></summary><div className="answer"><p>A valet is a thorough clean. A detail includes paint inspection, decontamination, and often machine polishing. A detail takes longer and costs more — because it&apos;s more.</p></div></details>
              <details className="faq"><summary>Do you do interior-only?<span className="icon">+</span></summary><div className="answer"><p>Yes. Interior deep clean including steam cleaning, fabric treatment, and leather conditioning where applicable.</p></div></details>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="book">
        <h2>Ready to <span className="blue">sort it?</span></h2>
        <p className="sub">Whether it&apos;s a one-off valet or the full lock-in — tell us what the car needs.</p>
        <a className="btn-big" href="https://matthewsandclark.co.za">Book a Slot <span className="arr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
      </section>

      <footer data-mc-footer=""></footer>
      <script dangerouslySetInnerHTML={{ __html: baScript }} />
    </>
  );
}
