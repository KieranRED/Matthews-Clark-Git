export const metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and conditions for Matthews / Clark automotive services in Cape Town. Booking, deposit, cancellation and service terms.',
  alternates: { canonical: 'https://www.matthewsandclark.co.za/mc-site/terms' },
  openGraph: {
    title: 'Terms & Conditions — Matthews / Clark Cape Town',
    description: 'Terms and conditions for Matthews / Clark automotive services in Cape Town.',
    url: 'https://www.matthewsandclark.co.za/mc-site/terms',
  },
  twitter: {
    title: 'Terms & Conditions — Matthews / Clark Cape Town',
    description: 'Terms and conditions for Matthews / Clark automotive services in Cape Town.',
  },
};

const pageCSS = `
  .legal-page {
    min-height: 100dvh;
    background: #0A0A0A;
    padding: 120px 24px 80px;
  }
  .legal-wrap {
    max-width: 720px;
    margin: 0 auto;
  }
  .legal-eyebrow {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: .22em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 20px;
    display: block;
  }
  .legal-page h1 {
    font-family: var(--display);
    font-size: clamp(40px, 8vw, 80px);
    line-height: .92;
    letter-spacing: 0;
    text-transform: uppercase;
    color: #fff;
    margin-bottom: 12px;
  }
  .legal-page .updated {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: rgba(255,255,255,.35);
    margin-bottom: 56px;
    display: block;
  }
  .legal-body {
    color: rgba(255,255,255,.7);
    font-family: var(--body);
    font-size: 16px;
    line-height: 1.75;
  }
  .legal-body h2 {
    font-family: var(--headline);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: #fff;
    margin: 48px 0 16px;
    padding-top: 48px;
    border-top: 1px solid rgba(255,255,255,.08);
  }
  .legal-body h2:first-child {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }
  .legal-body p {
    margin-bottom: 16px;
  }
  .legal-body ul {
    margin: 0 0 16px 20px;
  }
  .legal-body ul li {
    margin-bottom: 8px;
  }
  .legal-body a {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .legal-body strong {
    color: #fff;
    font-weight: 600;
  }
  .legal-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--headline);
    font-weight: 600;
    font-size: 13px;
    letter-spacing: .04em;
    color: rgba(255,255,255,.4);
    margin-top: 64px;
    transition: color .2s;
  }
  .legal-back:hover { color: #fff; }
`;

export default function TermsPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='legal';` }} />
      <style>{pageCSS}</style>

      <header data-mc-nav=""></header>

      <div className="legal-page">
        <div className="legal-wrap">
          <span className="legal-eyebrow">Legal</span>
          <h1>Terms &amp;<br/>Conditions<span style={{color:'var(--accent)'}}>.</span></h1>
          <span className="updated">Last updated: May 2026</span>

          <div className="legal-body">

            <h2>About these terms</h2>
            <p>
              These terms and conditions govern the services provided by <strong>Matthews / Clark</strong> (&ldquo;M/C&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).
              By submitting a booking or enquiry through this website, you agree to these terms.
            </p>
            <p>
              Matthews / Clark manages client relationships, consultations, project scoping and quality oversight.
              The physical installation work is carried out exclusively by our workshop partner,{' '}
              <strong>Izimoto</strong>, at their facility at 3 Muir Street, Woodstock, Cape Town.
            </p>

            <h2>Services</h2>
            <p>
              M/C offers the following services, coordinated through our partnership with Izimoto:
              paint protection film (PPF), vehicle wrapping, ceramic coating, paint correction, car detailing,
              body kits, custom wheels, and starlight headliners.
            </p>
            <p>
              All services are <strong>by appointment only</strong>. We do not accept walk-ins.
            </p>
            <p>
              Service specifications, timelines, and pricing are agreed in writing (via email or WhatsApp) before any
              booking is confirmed. Verbal commitments made outside of this process do not constitute a binding agreement.
            </p>

            <h2>Quotes and pricing</h2>
            <p>
              All quotes are provided in South African Rand (ZAR) and are valid for 14 days from the date of issue,
              unless otherwise stated. Prices are subject to change if vehicle condition at drop-off differs materially
              from what was described during the consultation.
            </p>
            <p>
              We reserve the right to revise a quote after physical inspection of the vehicle. You will be informed of
              any revision before work begins. You may cancel at no cost if you do not accept the revised quote,
              provided no work has commenced.
            </p>

            <h2>Bookings and deposits</h2>
            <p>
              A booking is confirmed only once a deposit has been received and acknowledged by M/C in writing.
              Deposit amounts are specified in your individual quote and are typically:
            </p>
            <ul>
              <li>50% of the total quoted value for film, wrap, and coating jobs</li>
              <li>Full payment upfront for detailing and correction jobs</li>
              <li>Variable for body kit and wheel sourcing (discussed case by case)</li>
            </ul>
            <p>
              Your slot is not reserved until the deposit clears. M/C accepts no responsibility for slot loss
              if a deposit is delayed.
            </p>

            <h2>Cancellations and rescheduling</h2>
            <p>
              <strong>Cancellation with more than 5 business days&rsquo; notice:</strong> Full deposit refund.
            </p>
            <p>
              <strong>Cancellation within 5 business days of the booked slot:</strong> Deposit is forfeited.
              This covers the cost of holding the workshop slot and any materials ordered specifically for your job.
            </p>
            <p>
              <strong>Rescheduling:</strong> You may reschedule once at no cost with more than 3 business days&rsquo; notice.
              Subsequent reschedules or short-notice changes may incur a rebooking fee, which we&rsquo;ll notify you of in advance.
            </p>
            <p>
              If M/C or Izimoto needs to reschedule due to circumstances outside our control (load shedding, equipment
              failure, supplier delays), we will notify you as early as possible and offer an alternative slot or full deposit refund.
            </p>

            <h2>Vehicle drop-off and collection</h2>
            <p>
              Vehicles must be dropped off at the agreed time at Izimoto&rsquo;s workshop: 3 Muir Street, Woodstock, Cape Town.
              Collection is by appointment and must be arranged in advance.
            </p>
            <p>
              You are responsible for ensuring your vehicle is free of personal belongings at drop-off. M/C and Izimoto
              accept no liability for personal items left in the vehicle.
            </p>
            <p>
              If a vehicle is not collected within 3 business days of the agreed collection date without prior arrangement,
              a storage fee of R250 per day may apply.
            </p>

            <h2>Vehicle condition and pre-existing damage</h2>
            <p>
              A pre-job condition report is conducted before any work begins. Any pre-existing damage — scratches, dents,
              stone chips, faded trim — is documented. You will be asked to review and sign off this report before work commences.
            </p>
            <p>
              M/C and Izimoto are not responsible for pre-existing defects or damage identified in the condition report.
            </p>
            <p>
              Paint correction and PPF work requires paint that is in an acceptable base condition. If paint is found to be
              heavily oxidised, peeling, or previously repaired to a poor standard, we will advise you before proceeding.
              In some cases we may recommend against certain services where the underlying condition would compromise the result.
            </p>

            <h2>Warranties and guarantees</h2>
            <p>Where applicable, product warranties are provided by the manufacturer, not by M/C directly. These include:</p>
            <ul>
              <li>PPF: 10-year manufacturer warranty against yellowing, cracking and delamination (subject to terms)</li>
              <li>Ceramic coating: warranty period varies by tier (Gold 1.5 years, Platinum 3 years, Diamond 5 years)</li>
              <li>Wrap film: manufacturer warranty on film integrity, typically 3–5 years</li>
            </ul>
            <p>
              Warranties are voided by improper aftercare, mechanical damage, use of incorrect cleaning products,
              or modifications to the treated surface after installation.
            </p>
            <p>
              Our workmanship guarantee: if an installation defect (not caused by product failure or client misuse) is
              identified within 30 days of collection, we will rectify it at no charge. Claims after 30 days are assessed
              on a case-by-case basis.
            </p>

            <h2>Liability</h2>
            <p>
              M/C acts as project manager and client liaison. The physical installation work is carried out by Izimoto,
              a registered and experienced automotive workshop. While we maintain quality oversight throughout,
              M/C&rsquo;s liability is limited to our role in that process.
            </p>
            <p>
              To the maximum extent permitted by South African law, M/C&rsquo;s total liability to you in connection with
              any service shall not exceed the amount you paid for that specific service.
            </p>
            <p>
              We are not liable for: indirect or consequential loss; loss of use of the vehicle during the service period;
              or events outside our reasonable control (including supplier delays, load shedding, or force majeure events).
            </p>

            <h2>Aftercare responsibility</h2>
            <p>
              We provide aftercare instructions for all services. Following these instructions is your responsibility.
              Failure to follow aftercare guidelines (for example, washing a freshly coated car too soon, or using
              pressure washers on PPF edges within the cure period) may void the workmanship guarantee and any
              applicable product warranty.
            </p>

            <h2>Governing law</h2>
            <p>
              These terms are governed by the laws of the Republic of South Africa. Any dispute arising from these terms
              will be subject to the jurisdiction of the South African courts.
            </p>
            <p>
              We encourage resolution of any dispute directly with us first. Email us at{' '}
              <a href="mailto:hello@matthewsandclark.co.za">hello@matthewsandclark.co.za</a> — we&rsquo;ll respond within one business day.
            </p>

            <h2>Changes to these terms</h2>
            <p>
              We may update these terms from time to time. The &ldquo;Last updated&rdquo; date reflects when changes were last made.
              The terms in effect at the time your booking was confirmed govern that booking.
            </p>

            <h2>Contact</h2>
            <p>
              <strong>Matthews / Clark</strong><br />
              c/o Izimoto, 3 Muir Street, Woodstock, Cape Town, 7925<br />
              <a href="mailto:hello@matthewsandclark.co.za">hello@matthewsandclark.co.za</a>
            </p>

            <a className="legal-back" href="/mc-site">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back home
            </a>

          </div>
        </div>
      </div>

      <footer data-mc-footer=""></footer>
    </>
  );
}
