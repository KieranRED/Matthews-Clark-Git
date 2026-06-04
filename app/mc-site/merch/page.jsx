export const metadata = {
  title: 'The Drops — Coming Soon',
  description: 'M/C The Drops — M/C gear and collectibles. Coming soon.',
};

const pageCSS = `
  .merch-cs{
    min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:#0A0A0A;text-align:center;padding:120px 24px 80px;
  }
  .merch-cs .eyebrow{
    font-family:var(--mono);font-size:11px;letter-spacing:.28em;text-transform:uppercase;
    color:var(--accent);margin-bottom:28px;display:inline-flex;align-items:center;gap:10px;
  }
  .merch-cs .eyebrow::before,.merch-cs .eyebrow::after{
    content:'';flex:1;height:1px;width:40px;background:rgba(31,79,255,.4);
  }
  .merch-cs h1{
    font-family:var(--display);font-size:clamp(72px,14vw,200px);line-height:.88;
    letter-spacing:0;text-transform:uppercase;color:#fff;
  }
  .merch-cs h1 .blue{color:var(--accent)}
  .merch-cs .sub{
    margin-top:32px;font-family:var(--body);font-size:18px;line-height:1.65;
    color:rgba(255,255,255,.6);max-width:38ch;
  }
  .merch-cs .back{
    margin-top:48px;display:inline-flex;align-items:center;gap:8px;
    font-family:var(--headline);font-weight:600;font-size:14px;letter-spacing:.04em;
    color:rgba(255,255,255,.55);transition:color .2s ease;
  }
  .merch-cs .back:hover{color:#fff}
  .merch-stamp{
    position:fixed;bottom:32px;right:24px;
    font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;
    color:rgba(255,255,255,.18);
  }
`;

export default function MerchPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='drops';` }} />
      <style>{pageCSS}</style>

      <header data-mc-nav=""></header>

      <div className="merch-cs">
        <span className="eyebrow">Coming Soon</span>
        <h1>The Drops<span className="blue">.</span></h1>
        <p className="sub">Something we&apos;re building. M/C gear, done properly. Check back.</p>
        <a className="back" href="/mc-site">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back home
        </a>
      </div>

      <span className="merch-stamp">Matthews / Clark · The Drops</span>

      <footer data-mc-footer=""></footer>
    </>
  );
}
