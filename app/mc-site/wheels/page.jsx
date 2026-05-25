export const metadata = {
  title: 'Custom Wheels',
  description: 'Matthews & Clark sources and manages custom wheel fitment in Cape Town through our partnership with Izimoto. Genuine aftermarket alloys. Correct fitment, every time.',
  alternates: { canonical: 'https://www.matthewsandclark.co.za/mc-site/wheels' },
  openGraph: {
    title: 'Custom Wheels — Matthews / Clark Cape Town',
    description: 'Matthews & Clark sources and manages custom wheel fitment in Cape Town through our partnership with Izimoto. Genuine aftermarket alloys. Correct fitment, every time.',
    url: 'https://www.matthewsandclark.co.za/mc-site/wheels',
  },
  twitter: {
    title: 'Custom Wheels — Matthews / Clark Cape Town',
    description: 'Matthews & Clark sources and manages custom wheel fitment in Cape Town through our partnership with Izimoto. Genuine aftermarket alloys. Correct fitment, every time.',
  },
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What brands do you stock or source?', acceptedAnswer: { '@type': 'Answer', text: 'We work across a range of aftermarket brands. Tell us your car and your budget and we\'ll advise.' } },
    { '@type': 'Question', name: 'Do you fit tyres as well?', acceptedAnswer: { '@type': 'Answer', text: 'Fitment and alignment, yes. We work with a tyre supplier for rubber if needed.' } },
    { '@type': 'Question', name: 'What\'s the difference between replica and genuine aftermarket?', acceptedAnswer: { '@type': 'Answer', text: 'Replicas are cast to look like a branded wheel but aren\'t manufactured to the same standards. Genuine aftermarket wheels are engineered to their own specification — correct load ratings, proper metallurgy. On real roads, it matters.' } },
    { '@type': 'Question', name: 'Can you advise on fitment for a lowered or modified car?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Offset, width and tyre stretch all need to work together. We won\'t sell you a wheel that doesn\'t fit your setup correctly.' } },
    { '@type': 'Question', name: 'Can I bring my existing wheels for fitting/balancing?', acceptedAnswer: { '@type': 'Answer', text: 'Yes.' } },
  ],
};

export default function WheelsPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='wheels';` }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header data-mc-nav=""></header>

      <section className="svc-hero">
        <div className="img"></div>
        <div className="scrim"></div>
        <span className="stamp">PHOTO  /  WHEELS  /  GENUINE</span>
        <div className="container">
          <div className="content">
            <div className="crumbs">
              <a href="/mc-site">Home</a><span className="sep">/</span>
              <a href="/mc-site/services">Services</a><span className="sep">/</span>
              <span className="here">Custom Wheels</span>
            </div>
            <h1>Custom Wheels.<br/><span className="blue">Real,</span> not reps.</h1>
            <div className="last-updated">Last updated <span className="b">May 2026</span> · Sourced</div>
            <div className="actions">
              <a className="btn-primary" href="#book" data-book="">Book a Slot <span className="arr"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
            </div>
          </div>
        </div>
      </section>

      <section className="svc-intro">
        <div className="container">
          <div className="label"><span className="num">02</span>What it is</div>
          <p>Matthews &amp; Clark sources and manages custom wheel projects in Cape Town through our partnership with Izimoto. We supply genuine aftermarket wheels from verified suppliers across a range of brands, finishes, and fitments. Sizing and offset is confirmed before ordering — Izimoto handles fitting, balancing and alignment at their Woodstock workshop. We won&apos;t spec a wheel that doesn&apos;t fit your setup correctly.</p>
        </div>
      </section>

      <section className="svc-explainer">
        <div className="container">
          <div className="copy">
            <p>Replica wheels exist. We don&apos;t sell them.</p>
            <p>The wheels we source are genuine aftermarket alloys from verified suppliers. Correct fitment, correct load rating — and they won&apos;t crack on the N2. Izimoto fits them properly. If you&apos;re building your car right, the last thing you should cut corners on is what it rolls on.</p>
            <p>Pair them with <a href="/mc-site/body-kits" style={{color:'var(--accent)'}}>a body kit</a>, protect the barrels with <a href="/mc-site/ppf" style={{color:'var(--accent)'}}>PPF</a>, or refinish a set you already love. We manage all of it as one project.</p>
            <a className="link-arrow" href="#book" data-book="">Get a quote on your car <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
          </div>
          <div className="photo"><span className="stamp">PHOTO  /  WHEELS  /  STUDIO</span></div>
        </div>
      </section>

      <section className="svc-options">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">03</span><span>How we do it</span></span></div>
          <div style={{background:'var(--grey-dark)',border:'1px solid var(--border)',borderRadius:'12px',padding:'48px',maxWidth:'760px'}}>
            <p style={{fontFamily:'var(--display)',fontSize:'32px',lineHeight:'1.05',letterSpacing:'.005em',textTransform:'uppercase',color:'#fff',textWrap:'balance'}}>Tell us your car, your budget and the look you&apos;re going for. We&apos;ll come back with three sets that actually fit.</p>
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
            <a className="rel-card" href="/mc-site/body-kits"><div className="left"><span className="k">Build</span><span className="n">Body Kits</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/mc-site/ppf"><div className="left"><span className="k">Protection</span><span className="n">PPF</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/mc-site/wrapping"><div className="left"><span className="k">Presence</span><span className="n">Wrapping</span></div><span className="arr">→</span></a>
          </div>
        </div>
      </section>

      <section className="svc-faq">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">07</span><span>FAQ</span></span></div>
          <div className="faq-grid">
            <div className="left"><h2>What people <span className="blue">ask us.</span></h2><p className="copy">If your question isn&apos;t here, drop it in the booking form. We answer them properly.</p></div>
            <div className="faq-list">
              <details className="faq"><summary>What brands do you stock or source?<span className="icon">+</span></summary><div className="answer"><p>We work across a range of aftermarket brands. Tell us your car and your budget and we&apos;ll advise.</p></div></details>
              <details className="faq"><summary>Do you fit tyres as well?<span className="icon">+</span></summary><div className="answer"><p>Fitment and alignment, yes. We work with a tyre supplier for rubber if needed.</p></div></details>
              <details className="faq"><summary>What&apos;s the difference between replica and genuine aftermarket?<span className="icon">+</span></summary><div className="answer"><p>Replicas are cast to look like a branded wheel but aren&apos;t manufactured to the same standards. Genuine aftermarket wheels are engineered to their own specification — correct load ratings, proper metallurgy. On real roads, it matters.</p></div></details>
              <details className="faq"><summary>Can you advise on fitment for a lowered or modified car?<span className="icon">+</span></summary><div className="answer"><p>Yes. Offset, width and tyre stretch all need to work together. We won&apos;t sell you a wheel that doesn&apos;t fit your setup correctly.</p></div></details>
              <details className="faq"><summary>Can I bring my existing wheels for fitting/balancing?<span className="icon">+</span></summary><div className="answer"><p>Yes.</p></div></details>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="book">
        <h2>Tell us what <span className="blue">you&apos;re looking for.</span></h2>
        <p className="sub">Car, current setup and your budget. We&apos;ll come back with options that actually fit.</p>
        <a className="btn-big" href="https://matthewsandclark.co.za">Book a Slot <span className="arr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
      </section>

      <footer data-mc-footer=""></footer>
      <script dangerouslySetInnerHTML={{ __html: baScript }} />
    </>
  );
}
