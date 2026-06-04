---
phase: 5
slug: integration-catalogue
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-04
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual + curl/fetch smoke tests (no unit test framework for static asset serving) |
| **Config file** | none |
| **Quick run command** | `curl -s http://localhost:3000/mc-site/wrap-studio -o /dev/null -w "%{http_code}"` |
| **Full suite command** | `node scripts/validate-catalogue.js` (verifies catalogue.js integrity post-build) |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** `curl -s http://localhost:3000/mc-site/wrap-studio -o /dev/null -w "%{http_code}"` → must return 200
- **After every plan wave:** Full manual smoke test in browser
- **Before `/gsd:verify-work`:** Studio loads, 375 colours visible, filters work
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | INT-01 | curl | `curl -s http://localhost:3000/mc-site/wrap-studio -w "%{http_code}"` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | INT-02 | manual | Load studio, check DevTools Network tab — JS/CSS served from /wrap-studio/ | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | CAT-01 | node | `node -e "const c=require('./public/wrap-studio/catalogue.js'); console.log(c.length)"` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 1 | CAT-05 | grep | `grep -c '"code"' public/wrap-studio/catalogue.js` → 375 | ❌ W0 | ⬜ pending |
| 5-02-03 | 02 | 1 | CAT-06 | node | `node scripts/validate-catalogue.js` — checks 18 blob URLs populated | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 2 | CAT-02 | manual | Brand filter chips render; clicking Hexis hides Avery/STEK entries | ❌ W0 | ⬜ pending |
| 5-03-02 | 03 | 2 | CAT-03 | manual | Finish filter chips include Metallic and Carbon; clicking filters correctly | ❌ W0 | ⬜ pending |
| 5-03-03 | 03 | 2 | CAT-04 | manual | Search "Matte Black" returns Avery + Hexis + STEK entries; search "SW900" returns Avery codes | ❌ W0 | ⬜ pending |
| 5-04-01 | 04 | 2 | INT-03 | manual | Open studio on iPhone/Android viewport in DevTools; no horizontal scroll | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/build-catalogue.js` — must exist before Wave 1 tasks can run
- [ ] `scripts/validate-catalogue.js` — validates catalogue.js output (375 entries, field completeness, blob URL count)
- [ ] `public/wrap-studio/` directory — must exist to serve static files

*Wave 0 is satisfied by Plan 01 (scaffold + blob upload script). No separate test framework needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Studio loads in <3s | INT-02 | Requires browser Network tab timing | Open studio, DevTools → Network, check DOMContentLoaded |
| Swatch hex fallback for no-image entries | CAT-06 | Visual check | Select Avery colour — chip shows hex background, no broken img |
| Low-confidence indicator | CAT-05 | Visual check | Filter to Chrome — swatch chips show `~` indicator |
| CTA links from wrapping page | INT-01 | Navigation check | Visit /mc-site/wrapping, confirm CTA button links to /mc-site/wrap-studio |
| Mobile layout | INT-03 | Device/viewport | Test on 390px viewport — all UI accessible, no overflow |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
