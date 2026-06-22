-- db/migrations/001-schema.sql
-- Run against DATABASE_URL_UNPOOLED (direct connection — DDL requires session-level access;
-- Neon PgBouncer pooler rejects session DDL). Runtime queries use DATABASE_URL (pooler).

-- Team WhatsApp numbers (eSIM numbers registered with Meta)
CREATE TABLE IF NOT EXISTS team_numbers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id         TEXT UNIQUE NOT NULL,   -- "27821234567"
  phone_number_id TEXT UNIQUE NOT NULL, -- Meta Phone Number ID for API calls
  display_name  TEXT NOT NULL,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- One thread per unique sender <> team number pair
CREATE TABLE IF NOT EXISTS whatsapp_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_wa_id   TEXT NOT NULL,              -- normalised sender phone: 27XXXXXXXXX
  team_wa_id      TEXT NOT NULL,              -- team number that received/will send
  crm_lead_id     TEXT,                       -- nullable FK: KV lead ID (linked on match)
  crm_client_id   TEXT,                       -- nullable FK: KV client ID
  contact_name    TEXT,                       -- from Meta contacts[].profile.name
  last_message_at TIMESTAMPTZ,               -- denormalised for thread list sorting
  last_message_preview TEXT,                 -- denormalised for thread list display
  unread_count    INT DEFAULT 0,             -- denormalised — avoids COUNT(*) on list render
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contact_wa_id, team_wa_id)
);

CREATE INDEX ON whatsapp_threads (last_message_at DESC);
CREATE INDEX ON whatsapp_threads (crm_lead_id) WHERE crm_lead_id IS NOT NULL;

-- Every inbound and outbound message
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wamid           TEXT UNIQUE NOT NULL,       -- Meta message ID, dedup key
  thread_id       UUID NOT NULL REFERENCES whatsapp_threads(id),
  direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_wa_id      TEXT NOT NULL,
  to_wa_id        TEXT NOT NULL,
  message_type    TEXT NOT NULL,              -- text, image, audio, document, video, sticker, etc.
  body            TEXT,                       -- null for non-text types in Phase 09
  media_url       TEXT,                       -- for media types (Phase 11+)
  timestamp_ms    BIGINT NOT NULL,            -- Unix ms from Meta payload timestamp field
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON whatsapp_messages (thread_id, timestamp_ms DESC);
CREATE INDEX ON whatsapp_messages (created_at DESC);

-- Web Push subscriptions (Phase 10, but table created here per FOUND-07)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       TEXT UNIQUE NOT NULL,
  endpoint        TEXT NOT NULL,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- AI-derived intelligence per thread (Phase 13, but table created here per FOUND-07)
CREATE TABLE IF NOT EXISTS lead_intelligence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID UNIQUE NOT NULL REFERENCES whatsapp_threads(id),
  warmth_score    INT CHECK (warmth_score BETWEEN 1 AND 10),
  objections      JSONB DEFAULT '[]',
  status_signal   TEXT,
  follow_up_at    TIMESTAMPTZ,
  last_analysed   TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Aftercare follow-up events (Phase 14, but table created here per FOUND-07)
CREATE TABLE IF NOT EXISTS aftercare_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_lead_id     TEXT NOT NULL,
  event_type      TEXT NOT NULL,              -- "2week_inspection", "1month_checkin"
  scheduled_at    TIMESTAMPTZ NOT NULL,
  sent_at         TIMESTAMPTZ,
  status          TEXT DEFAULT 'pending',     -- pending, sent, failed
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON aftercare_events (status, scheduled_at);

-- Broadcast campaigns (Phase 15, but table created here per FOUND-07)
CREATE TABLE IF NOT EXISTS broadcast_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  template_name   TEXT NOT NULL,
  target_criteria JSONB NOT NULL,
  status          TEXT DEFAULT 'draft',       -- draft, running, done
  sent_count      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  run_at          TIMESTAMPTZ
);
