export const metadata = {
  title: 'Privacy Policy',
  description: 'How Matthews / Clark collects, uses and protects your personal information. POPIA-compliant privacy policy for matthewsandclark.co.za.',
  alternates: { canonical: 'https://www.matthewsandclark.co.za/mc-site/privacy' },
  openGraph: {
    title: 'Privacy Policy — Matthews / Clark Cape Town',
    description: 'How Matthews / Clark collects, uses and protects your personal information.',
    url: 'https://www.matthewsandclark.co.za/mc-site/privacy',
  },
  twitter: {
    title: 'Privacy Policy — Matthews / Clark Cape Town',
    description: 'How Matthews / Clark collects, uses and protects your personal information.',
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

export default function PrivacyPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='legal';` }} />
      <style>{pageCSS}</style>

      <header data-mc-nav=""></header>

      <div className="legal-page">
        <div className="legal-wrap">
          <span className="legal-eyebrow">Legal</span>
          <h1>Privacy<br/>Policy<span style={{color:'var(--accent)'}}>.</span></h1>
          <span className="updated">Last updated: May 2026</span>

          <div className="legal-body">

            <h2>Who we are</h2>
            <p>
              This website is operated by <strong>Matthews / Clark</strong> (&ldquo;M/C&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;),
              a Cape Town-based automotive protection and customisation business founded by Kieran Redpath, Sam Clark and Keanan Matthews.
              Physical work is carried out by our workshop partner, <strong>Izimoto</strong>, at 3 Muir Street, Woodstock, Cape Town.
            </p>
            <p>
              We are the responsible party for personal information collected through this website,
              in terms of the <strong>Protection of Personal Information Act 4 of 2013 (POPIA)</strong>.
            </p>
            <p>
              Contact us at any time: <a href="mailto:hello@matthewsandclark.co.za">hello@matthewsandclark.co.za</a>
            </p>

            <h2>What information we collect</h2>
            <p>When you submit a booking or enquiry form on this website, we collect:</p>
            <ul>
              <li>Your name</li>
              <li>Your email address</li>
              <li>Your phone number</li>
              <li>Your vehicle details (make, model, year)</li>
              <li>The services you&rsquo;re interested in</li>
              <li>Any additional details you provide in free-text fields</li>
            </ul>
            <p>
              We do not collect payment card details through this website. Deposits and payments are handled separately and directly.
            </p>
            <p>
              We may also collect basic technical data automatically — your IP address, browser type, and pages visited — through
              our hosting provider (Vercel). This is standard infrastructure logging and is not used for advertising.
            </p>

            <h2>Why we collect it</h2>
            <p>We collect your personal information for the following purposes:</p>
            <ul>
              <li>To respond to your enquiry and provide a quote</li>
              <li>To book your vehicle in for the requested service</li>
              <li>To communicate with you throughout the project — from drop-off to collection</li>
              <li>To send invoices and payment requests</li>
              <li>To coordinate with Izimoto&rsquo;s installation team on your vehicle</li>
            </ul>
            <p>
              We do not use your information for marketing without your consent. We do not add you to mailing lists or newsletters automatically.
            </p>

            <h2>Who we share it with</h2>
            <p>Your information may be shared with:</p>
            <ul>
              <li>
                <strong>Izimoto</strong> — our workshop partner, who needs your vehicle details to carry out the installation work.
                Izimoto operates under equivalent confidentiality obligations.
              </li>
              <li>
                <strong>Our technology providers</strong> — including Vercel (hosting), our email service, and our internal CRM system.
                These are operational tools only and are not used for third-party marketing.
              </li>
            </ul>
            <p>We do not sell, rent, or trade your personal information to any third party.</p>

            <h2>How long we keep it</h2>
            <p>
              We retain your personal information for as long as necessary to fulfil the purpose for which it was collected,
              or as required by law. In practice:
            </p>
            <ul>
              <li>Enquiries that don&rsquo;t proceed to a booking: deleted within 12 months</li>
              <li>Completed jobs: retained for up to 5 years for warranty and dispute resolution purposes</li>
              <li>Invoice and payment records: retained for 5 years as required by tax law</li>
            </ul>

            <h2>Your rights under POPIA</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Know whether we hold personal information about you</li>
              <li>Request access to your personal information</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information (subject to legal retention requirements)</li>
              <li>Object to the processing of your information</li>
              <li>Lodge a complaint with the <strong>Information Regulator of South Africa</strong></li>
            </ul>
            <p>
              To exercise any of these rights, email us at{' '}
              <a href="mailto:hello@matthewsandclark.co.za">hello@matthewsandclark.co.za</a>.
              We will respond within a reasonable time.
            </p>

            <h2>Information Regulator</h2>
            <p>
              If you believe we have not handled your personal information correctly, you may lodge a complaint with
              the Information Regulator of South Africa:
            </p>
            <ul>
              <li>Website: <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer">inforegulator.org.za</a></li>
              <li>Email: <a href="mailto:complaints.IR@justice.gov.za">complaints.IR@justice.gov.za</a></li>
            </ul>

            <h2>Security</h2>
            <p>
              We take reasonable technical and organisational steps to protect your personal information from
              unauthorised access, loss, or misuse. Our website is served over HTTPS. Our internal systems
              use access controls and are not publicly accessible.
            </p>
            <p>
              No method of electronic transmission or storage is completely secure. While we take this seriously,
              we cannot guarantee absolute security.
            </p>

            <h2>Cookies</h2>
            <p>
              This website uses only essential technical cookies required for normal site operation
              (session handling, security). We do not use advertising or behavioural tracking cookies.
              You can disable cookies in your browser settings, though this may affect site functionality.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              We may update this privacy policy from time to time. The &ldquo;Last updated&rdquo; date at the top of this page
              reflects when it was last changed. Continued use of the website after a change constitutes acceptance of the updated policy.
            </p>

            <h2>Contact</h2>
            <p>
              For any privacy-related questions or requests:<br />
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
