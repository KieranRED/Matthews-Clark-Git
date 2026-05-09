# Lead Flow Platform — Master Project Brief

> **This document is the single source of truth for building the white-label lead flow platform. Read it in full before writing any code. Every architectural decision is recorded here with its rationale.**

---

## 0. Fix First — GitHub Large File Error

Before anything else, run these commands in the M&C repo directory to remove the large file from git history and unblock the push:

```bash
# Install git-filter-repo
brew install git-filter-repo

# Navigate to your local M&C repo
cd /path/to/your/local/matthews-clark-repo

# Strip any files over 100MB from entire git history
git filter-repo --strip-blobs-bigger-than 100M

# Ensure node_modules is ignored going forward
echo "node_modules/" >> .gitignore
echo ".next/" >> .gitignore
echo ".env*.local" >> .gitignore

git add .gitignore
git commit -m "chore: add gitignore for node_modules and build output"

# Force push (safe here since this is your private repo)
git push origin main --force
```

---

## 1. Project Overview

### What We Are Building

A white-label lead capture, CRM, and Telegram notification platform that can be deployed for any service-based business. Each client gets a fully isolated deployment with their own custom frontend, admin CRM, database, and Telegram bots — built from a shared core engine and configured via a single config file.

The platform is operated entirely from a central VPS running Claude Code. New clients are onboarded by generating a structured prompt from the Ops Dashboard and running it in Claude Code. Claude does the scaffolding, provisioning, and deployment automatically.

### Business Goals

- Replicate the M&C lead flow system for any service business in a single day of work
- Each client gets a bespoke UI, their own CRM, their own Telegram setup
- Platform scales to 20+ clients without proportional increase in maintenance overhead
- All infrastructure is automated — no manual deployment steps except DNS and BotFather token creation
- Uses Claude Max subscription via Claude Code on VPS instead of API credits

### Reference Codebase

**M&C Base Code (READ ONLY — do not modify):**
`https://github.com/KieranRED/Matthews-Clark-Git`

This is the production M&C system. Study it to understand the patterns. The platform core engine is extracted from this codebase. The M&C repo is never touched — it is the reference implementation only.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT LAYER                         │
│  Hostinger KVM 2 VPS (Ubuntu 24.04)                         │
│  ├── Claude Code (Max subscription)                         │
│  ├── code-server (browser-based VS Code)                    │
│  ├── Platform Monorepo (Git)                                │
│  └── Platform Skills (globally installed)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ deploys via Vercel API
┌──────────────────────────▼──────────────────────────────────┐
│                    HOSTING LAYER                             │
│  Vercel (one project per client app)                        │
│  ├── [client]-backend  → their API + admin CRM              │
│  └── [client]-frontend → their custom lead form UI          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    DATA LAYER                                │
│  Upstash (one Redis database per client)                    │
│  Doppler (secrets management across all clients)            │
│  Vercel Blob (PDF/file storage per client)                  │
│  Central Upstash DB (ops metrics across all clients)        │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Core engine is never touched per client.** All business logic lives in `packages/core`. Clients only write config and extensions.
2. **One config file per client** defines everything business-specific: services, stages, Telegram bots, form flow, commission logic.
3. **Separate frontend and backend repos** per client. They talk over a clean REST API. Frontend devs never touch backend.
4. **All provisioning is automated.** Upstash DB creation, Vercel project creation, Doppler secret injection — all done by the client-creation skill.
5. **The VPS is a dev environment only.** It holds no customer data. All data lives in Upstash. All apps run on Vercel.

---

## 3. Monorepo Structure

**Repository name:** `lead-flow-platform` (private GitHub repo)

```
lead-flow-platform/
├── packages/
│   ├── core/                    # The engine — never touch per client
│   │   ├── lib/
│   │   │   ├── kv.js            # Upstash/Redis adapter
│   │   │   ├── telegram.js      # Telegram Bot API wrapper
│   │   │   ├── email.js         # Resend email wrapper
│   │   │   ├── leadStore.js     # Lead CRUD operations
│   │   │   ├── clientStore.js   # Client record management
│   │   │   ├── jobStore.js      # Job/execution tracking
│   │   │   ├── taskStore.js     # Task management
│   │   │   ├── teamStore.js     # Team member management
│   │   │   ├── crmAdapter.js    # CRM data transformation (config-driven)
│   │   │   ├── adminAuth.js     # Session management
│   │   │   ├── signedToken.js   # HMAC link signing
│   │   │   └── attentionScore.js # Priority scoring engine
│   │   ├── api/                 # Reusable API route handlers
│   │   │   ├── lead.js          # Lead submission handler
│   │   │   ├── telegram.js      # Webhook handler
│   │   │   ├── admin.js         # CRM API handlers
│   │   │   └── portal.js        # Client portal handlers
│   │   ├── schema/
│   │   │   ├── lead.schema.js   # Zod lead validation (config-driven)
│   │   │   └── client.config.schema.js  # Zod schema for client config
│   │   └── package.json
│   │
│   └── addons/                  # Optional feature modules
│       ├── vendor-quotes/       # Subcontractor/vendor pricing flow (Izimoto-style)
│       ├── site-survey/         # Site visit scheduling (fencing, home services)
│       ├── deposit-flow/        # Deposit then balance payment model
│       ├── scheduling/          # Appointment booking module
│       ├── commission/          # Revenue and commission tracking
│       ├── whatsapp/            # WhatsApp alternative to Telegram
│       └── index.js             # Addon registry
│
├── apps/
│   ├── matthews-clark/          # CLIENT 1 — proof of concept
│   │   ├── backend/             # Next.js 15, imports from core
│   │   │   ├── client.config.js
│   │   │   ├── extensions/      # M&C-specific custom logic
│   │   │   └── ...
│   │   └── frontend/            # Custom UI (built with UI UX Pro Max)
│   │       ├── design-system/
│   │       │   └── MASTER.md    # Generated by UI UX Pro Max skill
│   │       └── ...
│   │
│   ├── [fencing-co]/            # CLIENT 2 (placeholder)
│   │   ├── backend/
│   │   └── frontend/
│   │
│   └── ops/                     # YOUR internal dashboard
│       ├── app/
│       │   ├── page.jsx         # Overview: all clients, health, leads
│       │   ├── clients/
│       │   │   └── new/         # Add client form → prompt generator
│       │   └── api/
│       │       ├── clients/     # Reads from central Upstash + Vercel API
│       │       └── health/      # Polls each client /api/internal/metrics
│       └── ...
│
├── skills/                      # Platform skills (also in separate private repo)
│   ├── client-creation/         # SKILL: scaffold a new client end to end
│   ├── core-update/             # SKILL: safely update core across clients
│   └── health-check/            # SKILL: check all client deployments
│
├── configs/                     # All client configs in one place
│   ├── matthews-clark.config.js
│   └── [fencing-co].config.js
│
├── turbo.json                   # Turborepo pipeline config
├── pnpm-workspace.yaml          # pnpm workspace definition
└── package.json
```

---

## 4. VPS Setup (Phase 1)

**Server:** Hostinger KVM 2 — Ubuntu 24.04 LTS  
**Purpose:** Development environment only. No customer data. No production apps.

Run the following as root after SSH access is established:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 22 LTS via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
nvm alias default 22

# Install pnpm
npm install -g pnpm

# Install GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
apt update && apt install gh -y

# Install Vercel CLI
npm install -g vercel

# Install Doppler CLI
curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh

# Install git-filter-repo (useful for git history fixes)
pip3 install git-filter-repo

# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Install code-server (browser-based VS Code)
curl -fsSL https://code-server.dev/install.sh | sh
systemctl enable --now code-server@root

# Configure code-server
mkdir -p ~/.config/code-server
cat > ~/.config/code-server/config.yaml << 'CODESERVER'
bind-addr: 0.0.0.0:8080
auth: password
password: CHANGE_THIS_PASSWORD
cert: false
CODESERVER

systemctl restart code-server@root

# Set up firewall
ufw allow 22    # SSH
ufw allow 8080  # code-server
ufw enable

# Install Turborepo globally
npm install -g turbo

# Authenticate tools (run these interactively)
gh auth login
vercel login
doppler login
```

After setup, access code-server at: `http://[your-vps-ip]:8080`

**Install UI UX Pro Max skill globally:**
```bash
npm install -g uipro-cli
uipro init --ai claude --global
```

**Install platform skills globally:**
```bash
# Clone the platform skills repo
git clone https://github.com/[your-org]/platform-skills ~/.claude/platform-skills
# Skills auto-load from ~/.claude/skills/
```

---

## 5. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 15 (App Router) | Same as M&C, proven, Vercel-native |
| Package manager | pnpm | Best monorepo support, fastest |
| Build orchestration | Turborepo | Knows what to rebuild, Vercel-native |
| Hosting | Vercel | Per-project isolation, preview deploys, KV/Blob |
| Database | Upstash Redis | Per-client instances, REST API for automation |
| Secrets | Doppler | Central management, Vercel sync, team access |
| Email | Resend | Simple API, reliable delivery |
| Messaging | Telegram Bot API | Proven in M&C, instant notifications |
| File storage | Vercel Blob | PDFs, invoice storage |
| UI base | Next.js + Tailwind + Shadcn/ui | Claude knows it well, consistent output |
| Design system | UI UX Pro Max skill | Industry-specific, generates MASTER.md |
| VPS OS | Ubuntu 24.04 LTS | Best Node.js + tooling support |
| Remote IDE | code-server | Browser-based VS Code on VPS |

---

## 6. Client Config Schema

Every client deployment is defined by a `client.config.js` file. This is the only file that differs between clients (aside from extensions). The Zod schema enforcing this lives in `packages/core/schema/client.config.schema.js`.

```javascript
// Example: client.config.js
export default {
  // Business identity
  business: {
    name: "Matthews & Clark",
    slug: "matthews-clark",
    industry: "automotive-detailing",
    website: "https://matthewsandclark.co.za",
    location: "Cape Town, South Africa",
    currency: "ZAR",
    vatRate: 0.15,
  },

  // Lead form services — defines what appears in the form
  services: [
    {
      id: "ppf",
      label: "Paint Protection Film",
      icon: "shield",
      description: "Full protection from stone chips and scratches",
      // Detail questions shown after service is selected
      detailFields: [
        { id: "coverage", type: "select", options: ["full-front", "track-pack", "full-car", "custom"] },
        { id: "film", type: "select", options: ["gloss", "matte", "satin"] },
        { id: "doorJambs", type: "boolean" },
        { id: "notes", type: "textarea" },
      ],
    },
    // ... more services
  ],

  // Qualification lanes (optional — omit for single-lane businesses)
  lanes: [
    { id: "protect", label: "Protect It", description: "PPF, ceramic, protection" },
    { id: "present", label: "Present It", description: "Detail, wrap, styling" },
    { id: "both", label: "Both", description: "Full experience" },
  ],

  // Timeframe options
  timeframes: [
    { id: "this-week", label: "This Week", urgent: true },
    { id: "this-month", label: "This Month", urgent: false },
    { id: "no-rush", label: "No Rush", urgent: false },
  ],

  // CRM pipeline stages (define the journey for this industry)
  stages: [
    { id: "new", label: "New", color: "blue" },
    { id: "called", label: "Called", color: "yellow" },
    { id: "quoted", label: "Quoted", color: "purple" },
    { id: "booked", label: "Booked", color: "green" },
    { id: "in-bay", label: "In Bay", color: "orange" },
    { id: "reveal", label: "Reveal", color: "pink" },
    { id: "delivered", label: "Delivered", color: "green" },
    { id: "aftercare", label: "Aftercare", color: "teal" },
    { id: "lost", label: "Lost", color: "red" },
  ],

  // Attention scoring rules (which events create urgency)
  attentionRules: {
    followUpOverdue: 120,
    invoiceOverdue: 110,
    consultationRequired: 90,
    newLead: 60,
    invoiceDueSoon: 75,
    invoiceNotSent: 55,
    bookingRequired: 45,
    invoiceUnpaid: 35,
    quotePending: 25,
    urgentTimeframe: 20,
  },

  // Telegram configuration
  telegram: {
    // Primary bot — receives new leads and action buttons
    primary: {
      botTokenEnvKey: "TELEGRAM_PRIMARY_BOT_TOKEN",
      chatIdEnvKey: "TELEGRAM_PRIMARY_CHAT_ID",
      webhookSecretEnvKey: "TELEGRAM_PRIMARY_WEBHOOK_SECRET",
    },
    // Secondary bot — vendor/subcontractor quotes (optional)
    vendor: {
      enabled: true,
      botTokenEnvKey: "TELEGRAM_VENDOR_BOT_TOKEN",
      chatIdEnvKey: "TELEGRAM_VENDOR_CHAT_ID",
    },
  },

  // Pricing and commission
  pricing: {
    defaultCommissionPercent: 20,
    depositPercent: 50,        // % required as deposit
    invoiceDueDays: 7,
    requireVendorQuote: true,  // triggers vendor Telegram bot flow
  },

  // Addons to enable for this client
  addons: ["vendor-quotes", "commission", "scheduling"],

  // Lead sources
  sources: ["instagram", "tiktok", "web", "referral", "walk-in"],
}
```

**Fencing company example config differences:**
```javascript
stages: [
  { id: "new" }, { id: "called" }, { id: "site-visit" },
  { id: "quoted" }, { id: "approved" }, { id: "installed" },
  { id: "signed-off" }, { id: "lost" }
],
addons: ["site-survey", "deposit-flow", "scheduling"],
pricing: { requireVendorQuote: false },
lanes: [], // single lane — no lane selection
```

---

## 7. Skills Ecosystem

All skills live in a private GitHub repo (`platform-skills`) and are installed globally on the VPS via Claude Code. They are the operational backbone of the platform.

### 7.1 Skills to Install (External)

**UI UX Pro Max**
- Repo: `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`
- Install: `uipro init --ai claude --global`
- Purpose: Generates industry-specific design systems. Run once per new client frontend. Outputs `design-system/MASTER.md` which becomes the source of truth for all UI decisions for that client.
- Usage: Feed it the business name, industry, and website. It outputs colour palette, typography, layout pattern, and component guidelines.

**Mass Desire Research**
- Repo: `https://github.com/KieranRED/Inzone-Dashboard---Claude-Skills` (mass-desire-research folder)
- Purpose: Deep market research before any build begins. Understands customer psychology, language, desires, and fears in the client's industry. Output feeds into form copy, service naming, and CRM stage language.
- Run: First step in every new client onboarding

**Marketing Skills**
- Repo: `https://github.com/coreyhaines31/marketingskills/tree/main/skills`
- Key skills for this platform: `copywriting`, `form-cro`, `page-cro`, `competitor-alternatives`, `content-strategy`
- Purpose: After market research, these skills generate conversion-optimised copy for the lead form, landing page, and CRM communications. Not placeholder text — actual copy informed by the market research output.

### 7.2 Skills to Build (Platform-Specific)

**client-creation** *(primary skill — must be built first)*

This is the most important skill. It orchestrates the entire new client onboarding process. When run in Claude Code on the VPS, it:

1. Reads the structured prompt generated by the Ops Dashboard
2. Runs `mass-desire-research` for the client's industry
3. Runs relevant `marketing skills` to generate form and page copy
4. Runs `UI UX Pro Max` to generate the design system (`MASTER.md`)
5. Creates the client folder structure in the monorepo:
   - `apps/[client-slug]/backend/`
   - `apps/[client-slug]/frontend/`
6. Generates `client.config.js` from the prompt inputs
7. Copies and adapts the skeleton backend and frontend templates
8. Selects addons based on requested features and wires them in
9. Provisions Upstash Redis database via Upstash API → captures credentials
10. Creates Vercel project via Vercel API (backend + frontend) → captures project IDs
11. Pushes all secrets to Doppler (creates client-specific environment)
12. Syncs Doppler to Vercel automatically
13. Registers Telegram webhook URL for the client's bot
14. Tests the webhook connection
15. Commits and pushes to GitHub → triggers Vercel auto-deploy
16. Outputs: DNS records to add manually, BotFather setup confirmation, admin login URL

**Input prompt format (generated by Ops Dashboard):**
```
CLIENT CREATION BRIEF
=====================
Business name: [name]
Slug: [slug]
Industry: [industry]
Website: [url]
Location: [city, country]
Currency: [ZZZ]
VAT rate: [%]

Services:
- [service 1]: [description]
- [service 2]: [description]

CRM stages: [list]
Addons required: [list]
Telegram primary bot token: [token]
Telegram primary chat ID: [id]
Telegram vendor bot token: [token or "none"]
Custom features: [description or "none"]

Market context: [paste any known info about their market]
```

**core-update** *(maintenance skill)*

Safely upgrades `packages/core` across one or more client deployments. Checks for breaking config schema changes, shows diff, requires confirmation before deploying to each client. Supports selective deployment (upgrade client A but not client B).

**health-check** *(monitoring skill)*

Polls all client deployments, checks `/api/internal/metrics` on each, reports any that are down or degraded. Can be run on demand from Claude Code.

---

## 8. Skeleton Templates

Two skeleton templates live in the monorepo root as the starting point for every new client:

```
skeletons/
├── backend/          # Copied to apps/[client]/backend/
│   ├── app/
│   │   ├── page.jsx               # Redirects to frontend (or placeholder)
│   │   ├── layout.jsx
│   │   ├── api/
│   │   │   ├── lead/route.js      # Imports handler from core
│   │   │   ├── telegram/route.js  # Imports handler from core
│   │   │   ├── admin/             # Imports handlers from core
│   │   │   └── internal/
│   │   │       └── metrics/route.js  # Reports to ops dashboard
│   │   └── admin/                 # CRM dashboard (from core)
│   ├── extensions/                # Empty — client-specific logic goes here
│   ├── client.config.js           # GENERATED per client — not a template
│   ├── package.json               # Imports from @platform/core
│   └── next.config.js
│
└── frontend/         # Copied to apps/[client]/frontend/
    ├── app/
    │   ├── page.jsx               # Lead form entry point
    │   ├── layout.jsx
    │   ├── book/[leadId]/         # Booking confirmation
    │   └── portal/                # Client portal
    ├── components/
    │   └── LeadFlow/              # Skeleton form — customised per client
    ├── design-system/
    │   └── MASTER.md              # Generated by UI UX Pro Max — source of truth
    ├── theme.config.js            # Brand colours, fonts, logo path — edit to rebrand
    └── package.json
```

**theme.config.js** — the only file needed to fully rebrand a frontend:
```javascript
export default {
  brand: {
    name: "Matthews & Clark",
    logo: "/logo.svg",
    primaryColor: "#0A0A0A",
    accentColor: "#D4AF37",
    fontHeading: "Neue Haas Grotesk",
    fontBody: "Inter",
    borderRadius: "0px",   // 0 = sharp edges, 8 = rounded, 16 = very rounded
  }
}
```

---

## 9. Addon Library

Addons are optional feature modules that extend the core engine. Each addon is self-contained — it exports API route handlers, CRM UI components, and config schema extensions. The client config lists which addons are active.

| Addon | Purpose | Built for |
|-------|---------|-----------|
| `vendor-quotes` | Subcontractor quote flow via second Telegram bot | Detailing (Izimoto), trades |
| `site-survey` | Site visit scheduling before quoting | Fencing, home services, landscaping |
| `deposit-flow` | Deposit + balance payment model with reminders | Any client taking deposits |
| `scheduling` | Full appointment booking with proposed slots | Any appointment-based business |
| `commission` | Revenue tracking, team commission calculations | Any client with sales team |
| `whatsapp` | WhatsApp Business API instead of Telegram | Clients preferring WhatsApp |

New addons get built when a client needs a feature that doesn't exist yet. Once built, every future client can enable it via config. Client-specific logic that won't be reused goes in their `extensions/` folder instead.

---

## 10. Ops Dashboard

**Location:** `apps/ops/` — deployed to Vercel as a private internal app (password protected)

**Two functions:**

### 10.1 Add Client — Prompt Generator

A form that collects all information needed to onboard a new client:
- Business name, slug, website, industry, location, currency
- Services (name + description for each)
- CRM stages
- Features/addons required
- Telegram bot tokens (primary + vendor if applicable)
- Any custom features

On submit, it generates a perfectly formatted client creation prompt (the format defined in Section 7.2) that you copy and paste into Claude Code on the VPS. Claude Code then runs the `client-creation` skill.

**No direct deployment from the Ops Dashboard.** It is a prompt generator only. All actual provisioning happens in Claude Code on the VPS.

### 10.2 Platform Monitor

Reads from two sources:
1. **Central Upstash DB** — each client backend pushes a heartbeat + key metrics on every lead submission and status change
2. **Vercel API** — deployment status, last deploy time, build health

Displays per client:
- Online / degraded / offline status
- Lead count (today / this week / total)
- Last activity timestamp
- Current core version
- Quick link to their admin CRM

---

## 11. CI/CD Pipeline

```
Developer pushes to GitHub (from VPS)
    │
    ▼
GitHub Actions runs
    │
    ├── Turborepo detects what changed
    │   ├── packages/core changed → rebuild ALL client apps
    │   ├── apps/matthews-clark/* changed → rebuild M&C only
    │   └── apps/ops/* changed → rebuild ops dashboard only
    │
    ▼
Vercel auto-deploys affected projects
    │
    ├── Pull request → deploys to preview URL (staging)
    └── Merge to main → deploys to production
```

**Core versioning:** `packages/core` uses semantic versioning. Client backends pin to a core version in their `package.json`. To upgrade a client, bump their core version and push. This means you control exactly which clients get updates and when.

---

## 12. Telegram Setup (Per Client)

**Manual step (2 minutes):**
1. Open Telegram → search `@BotFather`
2. `/newbot` → follow prompts → copy the bot token
3. If vendor bot needed, repeat for second bot
4. Paste tokens into the client creation prompt

**Automated (by client-creation skill):**
- Registers webhook: `POST https://api.telegram.org/bot{token}/setWebhook`
- Sets bot name and description
- Configures bot commands
- Tests the connection with a ping message
- Stores tokens in Doppler

---

## 13. Secrets Management (Doppler)

Each client has a Doppler project named `[client-slug]` with environments: `dev`, `staging`, `production`.

Doppler syncs to Vercel automatically — when a secret changes in Doppler, Vercel redeploys with the new value.

**Secrets per client:**
```
TELEGRAM_PRIMARY_BOT_TOKEN
TELEGRAM_PRIMARY_CHAT_ID
TELEGRAM_PRIMARY_WEBHOOK_SECRET
TELEGRAM_VENDOR_BOT_TOKEN          (if vendor addon enabled)
TELEGRAM_VENDOR_CHAT_ID            (if vendor addon enabled)
KV_REST_API_URL                    (Upstash — auto-provisioned)
KV_REST_API_TOKEN                  (Upstash — auto-provisioned)
BLOB_READ_WRITE_TOKEN              (Vercel Blob)
RESEND_API_KEY
EMAIL_FROM
ADMIN_USERNAME
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
LEAD_LINK_SECRET
DEFAULT_COMMISSION_PERCENT
NEXT_PUBLIC_BASE_URL
```

---

## 14. Database Strategy (Upstash)

**One Redis database per client.** Provisioned automatically by the client-creation skill via Upstash REST API.

**Central ops database:** One additional Upstash database for the ops dashboard. Each client backend writes metrics to this central DB on key events. Never contains PII — only counts and timestamps.

**Client data never mingles.** Each client's Redis instance is completely isolated.

---

## 15. Phase Execution Order

Build in this exact order. Each phase must be complete before the next begins.

| Phase | Task | Deliverable |
|-------|------|-------------|
| 1 | VPS setup | Working Ubuntu server with all tools installed |
| 2 | Private GitHub org + monorepo scaffold | Empty monorepo with Turborepo configured |
| 3 | Core engine extraction | `packages/core` with all M&C logic extracted and generalised |
| 4 | Config schema | Zod schema for `client.config.js` validated against M&C config |
| 5 | Skeleton templates | `skeletons/backend/` and `skeletons/frontend/` working |
| 6 | Initial addon library | `vendor-quotes`, `commission`, `scheduling`, `deposit-flow` built |
| 7 | M&C rebuilt on platform | `apps/matthews-clark/` fully working — proves the abstraction |
| 8 | client-creation skill | Full automation tested against a dummy client |
| 9 | Ops dashboard | Add client form + platform monitor live |
| 10 | CI/CD pipeline | GitHub Actions + Vercel auto-deploy working |
| 11 | Platform skills installed | All external skills installed on VPS globally |
| 12 | Second client (fencing) | Real client proves multi-industry config works |

---

## 16. M&C Rebuild (Phase 7 Detail)

Matthews & Clark is rebuilt as `apps/matthews-clark/` using the platform. This is the proof of concept — if M&C can be fully recreated using core + config with identical behaviour to the original, the abstraction is correct.

**Source of truth for M&C rebuild:** `https://github.com/KieranRED/Matthews-Clark-Git`
- Read this repo to understand all M&C-specific behaviour
- Do not modify it
- The rebuilt version lives in `apps/matthews-clark/` — completely separate

**M&C config will include:**
- Services: ppf, wrap, tint, ceramic, correct, detail, wheel, kit, unsure
- Lanes: protect, present, both
- Stages: new, called, quoted, booked, in-bay, reveal, delivered, aftercare, lost
- Addons: vendor-quotes (Izimoto), commission, scheduling
- Two Telegram bots (M&C + Izimoto)

---

## 17. Domain Setup (Manual)

The one step that cannot be automated. When a new client goes live:

The client-creation skill outputs the exact DNS records to add:
```
Type: A
Name: @
Value: 76.76.21.21   (Vercel IP)

Type: CNAME  
Name: www
Value: cname.vercel-dns.com
```

Add these in the client's domain registrar. Vercel handles SSL cert automatically.

---

## 18. External Skill Repos (Reference)

| Skill | Repo | Install Command |
|-------|------|----------------|
| UI UX Pro Max | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | `uipro init --ai claude --global` |
| Mass Desire Research | https://github.com/KieranRED/Inzone-Dashboard---Claude-Skills | Manual install to `~/.claude/skills/` |
| Marketing Skills | https://github.com/coreyhaines31/marketingskills/tree/main/skills | Manual install to `~/.claude/skills/` |
| M&C Reference | https://github.com/KieranRED/Matthews-Clark-Git | Read only — never modify |

---

## 19. Conventions

- **Naming:** Client slugs are lowercase kebab-case: `matthews-clark`, `cape-fencing-co`
- **Branches:** `main` is production. Feature work on `feat/[description]`. Client work on `client/[slug]`
- **Commits:** Conventional commits — `feat:`, `fix:`, `chore:`, `client:`
- **No secrets in git:** Ever. All secrets via Doppler only.
- **node_modules never committed:** `.gitignore` enforced at monorepo root
- **Core changes need a version bump:** Any change to `packages/core` bumps the patch version minimum

---

*Brief version: 1.0 — compiled from full architecture planning session*
*All decisions are final unless explicitly revisited*
