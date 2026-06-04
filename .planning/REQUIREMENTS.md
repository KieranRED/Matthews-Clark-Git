# Requirements: Matthews & Clark — v1.1 Wrap Visualisation Studio

## Milestone Goal
Ship a public-facing wrap visualisation tool at /wrap-studio where customers upload their car photo, choose from 375 real Avery/Hexis/STEK colours, see a mathematically accurate colour + finish preview, receive a GPT-Image-2 studio render, and fire a quote into the M&C CRM.

---

## Active Requirements

### Integration & Routing
- [x] **INT-01**: Customer can access the wrap studio at `/wrap-studio` on the M&C site without logging in
- [x] **INT-02**: Studio loads within 3 seconds on first visit (CSS/JS served from Next.js public or route handler)
- [ ] **INT-03**: Studio is mobile-responsive and usable on phone screen (customer takes photo on device and uses it immediately)

### Colour Catalogue
- [ ] **CAT-01**: Customer can browse all 375 real wrap films (Avery 152, Hexis 197, STEK 26) in the catalogue
- [ ] **CAT-02**: Customer can filter catalogue by brand (All / Avery Dennison / Hexis / STEK)
- [ ] **CAT-03**: Customer can filter by finish type (Gloss / Satin / Matte / Chrome / Colour-shift / Carbon / PPF)
- [ ] **CAT-04**: Customer can search catalogue by colour name or product code
- [ ] **CAT-05**: Each swatch shows the real product code, series name, and finish type from the official catalogue
- [ ] **CAT-06**: Swatch images load from the curated swatch library (375 cropped swatch PNGs)

### Car Upload & Background Removal
- [ ] **UPLOAD-01**: Customer can upload a car photo by drag-and-drop or file picker (JPG, PNG, HEIC)
- [ ] **UPLOAD-02**: Background is removed from the uploaded photo in-browser using @imgly/background-removal WASM — no server round-trip for this step
- [ ] **UPLOAD-03**: Background-removed PNG is used as a pixel mask for the recolour engine
- [ ] **UPLOAD-04**: Customer sees a progress indicator while background removal runs

### Recolour Engine (Fast Preview)
- [ ] **RCOL-01**: Selecting a colour instantly applies a finish-accurate preview to the masked car using canvas HSL pixel transform
- [ ] **RCOL-02**: Gloss finish: preserves and amplifies specular highlights with a sheen layer
- [ ] **RCOL-03**: Matte finish: applies flat diffuse — zero specularity
- [ ] **RCOL-04**: Satin finish: preserves shadow/highlight structure, dampens specular by ~60%
- [ ] **RCOL-05**: Chrome finish: applies animated gradient band sweep across the car surface
- [ ] **RCOL-06**: Metallic finish: HSL transform + subtle grain noise layer to simulate flake depth
- [ ] **RCOL-07**: Colour-shift finish: animated two-tone HSL gradient simulating angle-dependent flip
- [ ] **RCOL-08**: PPF clear/matte: thin tint overlay only, preserving underlying paint character
- [ ] **RCOL-09**: Customer can assign different colours to individual panels (bonnet, roof, mirrors, pillars, boot, accents, full body)
- [ ] **RCOL-10**: Before/after swipe slider shows original vs wrapped car

### GPT-Image-2 Studio Render
- [ ] **RENDER-01**: Customer can trigger a "Studio Render" which calls `/api/wrap-render`
- [ ] **RENDER-02**: The render endpoint sends the pre-coloured car composite (canvas output) to GPT-Image-2 — colour and finish are already applied; GPT's job is scene integration only
- [ ] **RENDER-03**: GPT prompt is finish-aware — specifies gloss/matte/chrome/etc. so GPT preserves the material character while blending the car into the studio scene
- [ ] **RENDER-04**: Render composites the car into the M&C studio bay background (studio lighting scene)
- [ ] **RENDER-05**: Customer sees a progress indicator during render (~10–20s)
- [ ] **RENDER-06**: Rendered result replaces the fast preview on the stage; before/after slider compares original car vs studio render

### Quote & CRM Integration
- [ ] **QUOTE-01**: Customer can open a quote request modal with their selected colour(s) and panel assignment pre-filled
- [ ] **QUOTE-02**: Quote form captures: name, car (make/model/year), WhatsApp/phone, notes
- [ ] **QUOTE-03**: Submitting the form creates a lead record in the M&C KV lead store with colour selection, panel breakdown, and price tier attached
- [ ] **QUOTE-04**: Submission triggers a Telegram notification to the M&C group with the colour selection and customer details
- [ ] **QUOTE-05**: Customer sees a confirmation message after successful submission

### Share & Download
- [ ] **SHARE-01**: Customer can download the current render as a watermarked PNG (M&C branding applied)
- [ ] **SHARE-02**: Customer can generate a shareable link that opens the studio with their colour selection pre-loaded

---

## Future Requirements (next milestone)

- Studio backgrounds — M&C shoots a set of real bay photos at 3/4 front, side, 3/4 rear angles for compositing alignment
- Comparison grid — pin up to 4 colours and view the car simultaneously
- Lighting toggle — studio / sun / overcast / night
- Analytics — which colours are most browsed and quoted, feed into CRM dashboard

---

## Out of Scope (v1.1)

- Server-side background removal (in-browser WASM removes latency + cost)
- 3D model rendering (requires per-make/model 3D assets — not scalable for v1.1)
- Video rendering or animated wraps
- Customer login / saved sessions across devices (localStorage is sufficient for v1.1)
- Admin catalogue management UI

---

## Traceability

| Phase | Requirements |
|-------|-------------|
| Phase 5: Integration & Catalogue | INT-01, INT-02, INT-03, CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06 |
| Phase 6: Upload & Recolour Engine | UPLOAD-01, UPLOAD-02, UPLOAD-03, UPLOAD-04, RCOL-01, RCOL-02, RCOL-03, RCOL-04, RCOL-05, RCOL-06, RCOL-07, RCOL-08, RCOL-09, RCOL-10 |
| Phase 7: GPT-Image-2 Render | RENDER-01, RENDER-02, RENDER-03, RENDER-04, RENDER-05, RENDER-06 |
| Phase 8: Quote & Distribution | QUOTE-01, QUOTE-02, QUOTE-03, QUOTE-04, QUOTE-05, SHARE-01, SHARE-02 |
