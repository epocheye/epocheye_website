-- Epocheye Play (/play): players, runs, daily results, votes, cards and events (2026-11-17).
--
-- Additive only. Every table and index is new, prefixed play_, and created IF NOT EXISTS.
-- Nothing else in the database is touched. Run with:
--   node --env-file=.env.local scripts/migrate-play.mjs
--
-- Anonymous by default: a player is a random id kept in the browser. Email is optional and
-- stored only with consent. display_name always comes from the generated list in
-- lib/play/names.js, never from free text. creator_code is a promo code checked (read only)
-- against promo_codes; the creator program's own click and conversion tables are never written.

CREATE TABLE IF NOT EXISTS play_players (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id           text NOT NULL UNIQUE,
  display_name      text NOT NULL,
  email             text UNIQUE,
  email_consent     boolean NOT NULL DEFAULT false,
  email_consent_at  timestamptz,
  unlock_token      text,
  creator_code      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_seen_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS play_players_unlock_token_idx ON play_players (unlock_token) WHERE unlock_token IS NOT NULL;

-- One row per run of a level. started_at is the run's own key, set when the player starts it,
-- so every progress call for the same run lands on the same row.
CREATE TABLE IF NOT EXISTS play_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      uuid NOT NULL REFERENCES play_players (id) ON DELETE CASCADE,
  site           text NOT NULL,
  pack_version   int NOT NULL,
  lens           text,
  chapters_done  text[] NOT NULL DEFAULT '{}',
  completed      boolean NOT NULL DEFAULT false,
  duration_s     int,
  accuracy       numeric(5, 4),
  choices        jsonb NOT NULL DEFAULT '{}'::jsonb,
  year_vote      text,
  creator_code   text,
  source         text,
  started_at     timestamptz NOT NULL,
  finished_at    timestamptz,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, site, started_at)
);

CREATE INDEX IF NOT EXISTS play_runs_site_completed_idx ON play_runs (site, completed, finished_at);

CREATE TABLE IF NOT EXISTS play_daily (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day          date NOT NULL,
  player_id    uuid NOT NULL REFERENCES play_players (id) ON DELETE CASCADE,
  puzzle_id    text NOT NULL,
  result       jsonb NOT NULL DEFAULT '{}'::jsonb,
  correct      boolean NOT NULL DEFAULT false,
  score        int NOT NULL DEFAULT 0,
  duration_ms  int,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day, player_id)
);

CREATE INDEX IF NOT EXISTS play_daily_board_idx ON play_daily (day, score DESC, duration_ms);
CREATE INDEX IF NOT EXISTS play_daily_player_idx ON play_daily (player_id, day);

-- The weekly vote for the next site. week is the Monday the week starts on (UTC).
CREATE TABLE IF NOT EXISTS play_votes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week         date NOT NULL,
  player_id    uuid NOT NULL REFERENCES play_players (id) ON DELETE CASCADE,
  site_choice  text NOT NULL,
  binding      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week, player_id)
);

CREATE INDEX IF NOT EXISTS play_votes_week_idx ON play_votes (week, site_choice);

-- "Which year would you put back?" One vote per player per site; a player may change it.
CREATE TABLE IF NOT EXISTS play_year_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site        text NOT NULL,
  player_id   uuid NOT NULL REFERENCES play_players (id) ON DELETE CASCADE,
  option_id   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site, player_id)
);

CREATE INDEX IF NOT EXISTS play_year_votes_site_idx ON play_year_votes (site, option_id);

-- A "What you now know" card behind a short id: /play/c/<id>. payload holds ids only (the same
-- shape as the long base64 card ids, which keep working). payload_hash makes the same card
-- always get the same short id.
CREATE TABLE IF NOT EXISTS play_cards (
  id            text PRIMARY KEY,
  site          text NOT NULL,
  pack_version  int NOT NULL,
  payload       jsonb NOT NULL,
  payload_hash  text NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Cookieless analytics. No IP, no user agent: an anonymous id, what happened, where.
CREATE TABLE IF NOT EXISTS play_events (
  id            bigserial PRIMARY KEY,
  ts            timestamptz NOT NULL DEFAULT now(),
  anon_id       text,
  site          text,
  name          text NOT NULL,
  chapter       text,
  props         jsonb NOT NULL DEFAULT '{}'::jsonb,
  source        text,
  creator_code  text,
  path          text
);

CREATE INDEX IF NOT EXISTS play_events_site_name_ts_idx ON play_events (site, name, ts);
CREATE INDEX IF NOT EXISTS play_events_ts_idx ON play_events (ts);

-- ---- Added in the Phase 3 review (2026-11-17). Still additive only: new play_ tables.

-- When the server first saw a run (its first /run/progress call). A run's time on the leaderboard
-- is measured from here to the finish, on the server's clock, never from what the browser says.
CREATE TABLE IF NOT EXISTS play_run_clock (
  run_id         uuid PRIMARY KEY REFERENCES play_runs (id) ON DELETE CASCADE,
  first_seen_at  timestamptz NOT NULL DEFAULT now()
);

-- When the server handed a player the day's first clue (POST /api/play/daily/start). The daily
-- board's time is measured from here to the answer. The first start of a day stands.
CREATE TABLE IF NOT EXISTS play_daily_starts (
  day         date NOT NULL,
  player_id   uuid NOT NULL REFERENCES play_players (id) ON DELETE CASCADE,
  puzzle_id   text NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, player_id)
);

-- An address a player has asked to use, not yet confirmed. Any number of players may claim the
-- same address; the first to confirm it gets it (play_players.email is set only on confirmation).
-- nonce is the one link that is live for this claim.
CREATE TABLE IF NOT EXISTS play_email_claims (
  player_id     uuid PRIMARY KEY REFERENCES play_players (id) ON DELETE CASCADE,
  email         text NOT NULL,
  nonce         text NOT NULL,
  consent_at    timestamptz NOT NULL,
  requested_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS play_email_claims_email_idx ON play_email_claims (email);

-- One row per email Play sends (or would send, in dry run). email_tag is a truncated SHA-256 of
-- the address, never the address. slot is the two-minute window the send falls in: the unique key
-- makes "one send per player every two minutes" hold even when two requests race.
CREATE TABLE IF NOT EXISTS play_email_sends (
  id         bigserial PRIMARY KEY,
  player_id  uuid NOT NULL REFERENCES play_players (id) ON DELETE CASCADE,
  email_tag  text NOT NULL,
  kind       text NOT NULL,
  dry_run    boolean NOT NULL DEFAULT false,
  slot       bigint NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, slot)
);

CREATE INDEX IF NOT EXISTS play_email_sends_tag_idx ON play_email_sends (email_tag, sent_at);
CREATE INDEX IF NOT EXISTS play_email_sends_player_idx ON play_email_sends (player_id, sent_at);

-- Addresses that asked for no more Play email, by tag. by_owner is true when the player who
-- stopped it had that address confirmed; only that player can lift the stop by giving consent again.
CREATE TABLE IF NOT EXISTS play_email_stops (
  email_tag   text PRIMARY KEY,
  player_id   uuid REFERENCES play_players (id) ON DELETE SET NULL,
  by_owner    boolean NOT NULL DEFAULT false,
  stopped_at  timestamptz NOT NULL DEFAULT now()
);
