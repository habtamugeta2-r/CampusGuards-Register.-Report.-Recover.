-- ===========================================================================
-- CampusGuard — initial schema (PostgreSQL 14+)
--
-- Conventions and the reasons behind them:
--  * Every tenant-scoped table carries institution_id so a single deployment
--    can isolate several universities (multi-campus expansion later).
--  * Status columns are TEXT + CHECK rather than native PG enums. Native enums
--    cannot drop values in a transaction, which makes early-stage iteration
--    painful; CHECK constraints are cheap and easy to evolve.
--  * Ownership is its own table (not a column on products) so history survives
--    transfers and can be audited.
--  * QR codes hold an opaque random token. Nothing about the student is encoded
--    in the code.
--  * scan_events is the surveillance-sensitive table: shortest retention
--    window, strictest access rules, and carrier identity is optional.
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Tenancy & identity
-- ---------------------------------------------------------------------------

CREATE TABLE institutions (
  id                        TEXT PRIMARY KEY,
  name                      TEXT NOT NULL,
  code                      TEXT NOT NULL UNIQUE,
  email_domain              TEXT NOT NULL UNIQUE,
  city                      TEXT,
  country                   TEXT NOT NULL DEFAULT 'Ethiopia',
  timezone                  TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
  scan_retention_days       INTEGER NOT NULL DEFAULT 90,
  report_retention_days     INTEGER NOT NULL DEFAULT 730,
  audit_retention_days      INTEGER NOT NULL DEFAULT 1095,
  qr_token_rotate_days      INTEGER NOT NULL DEFAULT 365,
  require_scan_justification BOOLEAN NOT NULL DEFAULT TRUE,
  allow_aggregate_analytics  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id                  TEXT PRIMARY KEY,
  institution_id      TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  password_hash       TEXT NOT NULL,
  full_name           TEXT NOT NULL,
  phone               TEXT,
  role                TEXT NOT NULL DEFAULT 'STUDENT'
                        CHECK (role IN ('STUDENT','SECURITY','ADMIN')),
  status              TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','DISABLED')),
  last_login_at       TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  failed_login_count  INTEGER NOT NULL DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,
  UNIQUE (institution_id, email)
);
CREATE INDEX users_institution_role_idx   ON users (institution_id, role);
CREATE INDEX users_institution_status_idx ON users (institution_id, status);

-- Fayda (Ethiopia's national digital ID) is the official student ID. Storing it
-- is optional and off by default; see docs/03-operations/compliance.md.
CREATE TABLE student_profiles (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  student_id   TEXT NOT NULL UNIQUE,
  department   TEXT,
  year_of_study INTEGER,
  dorm         TEXT,
  fayda_id     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  ip          TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx     ON sessions (user_id);
CREATE INDEX sessions_expires_idx  ON sessions (expires_at);

CREATE TABLE invitations (
  id            TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('STUDENT','SECURITY','ADMIN')),
  token         TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  accepted_at   TIMESTAMPTZ,
  created_by_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, email)
);

-- ---------------------------------------------------------------------------
-- Property registry
-- ---------------------------------------------------------------------------

CREATE TABLE products (
  id                   TEXT PRIMARY KEY,
  institution_id       TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  owner_id             TEXT NOT NULL REFERENCES users(id),
  type                 TEXT NOT NULL
                         CHECK (type IN ('LAPTOP','PHONE','TABLET','MONITOR','CAMERA','AUDIO','WATCH','OTHER')),
  brand                TEXT NOT NULL,
  model                TEXT NOT NULL,
  serial_number        TEXT,
  color                TEXT,
  distinguishing_marks TEXT,
  photo_url            TEXT,
  status               TEXT NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE','REPORTED_MISSING','RECOVERED','RETIRED')),
  registered_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_at           TIMESTAMPTZ,
  retired_reason       TEXT,
  notes                TEXT
);
CREATE INDEX products_institution_status_idx ON products (institution_id, status);
CREATE INDEX products_owner_status_idx       ON products (owner_id, status);

CREATE TABLE product_identifiers (
  id             TEXT PRIMARY KEY,
  product_id     TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('QR_TOKEN','SERIAL','ASSET_TAG')),
  value          TEXT NOT NULL UNIQUE,
  label          TEXT,
  is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at     TIMESTAMPTZ,
  revoked_reason TEXT
);
CREATE INDEX product_identifiers_product_idx ON product_identifiers (product_id);
CREATE INDEX product_identifiers_kind_idx    ON product_identifiers (kind, revoked_at);

CREATE TABLE ownerships (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  owner_id   TEXT NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at   TIMESTAMPTZ,
  event      TEXT NOT NULL DEFAULT 'REGISTERED',
  note       TEXT
);
CREATE INDEX ownerships_product_idx ON ownerships (product_id, started_at);
CREATE INDEX ownerships_owner_idx   ON ownerships (owner_id);

CREATE TABLE borrow_authorizations (
  id                  TEXT PRIMARY KEY,
  product_id          TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  owner_id            TEXT NOT NULL REFERENCES users(id),
  borrower_id         TEXT NOT NULL REFERENCES users(id),
  borrower_identifier TEXT NOT NULL,
  reason              TEXT,
  starts_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at             TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX borrow_auth_product_idx  ON borrow_authorizations (product_id, revoked_at);
CREATE INDEX borrow_auth_borrower_idx ON borrow_authorizations (borrower_id);
CREATE INDEX borrow_auth_ends_idx     ON borrow_authorizations (ends_at);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

CREATE TABLE missing_reports (
  id                  TEXT PRIMARY KEY,
  institution_id      TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  product_id          TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reporter_id         TEXT NOT NULL REFERENCES users(id),
  category            TEXT NOT NULL CHECK (category IN ('LOST','STOLEN','MISPLACED','CONFISCATED')),
  status              TEXT NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN','RESOLVED_RECOVERED','CLOSED_UNFOUND','WITHDRAWN','FALSE_REPORT')),
  description         TEXT,
  last_known_location TEXT,
  occurred_at         TIMESTAMPTZ,
  reported_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at         TIMESTAMPTZ,
  resolution_notes    TEXT,
  -- channel records how the incident reached the university: whether the
  -- platform is genuinely displacing Telegram/security-desk reporting.
  channel             TEXT NOT NULL DEFAULT 'CAMPUSGUARD',
  handled_by_id       TEXT
);
CREATE INDEX missing_reports_institution_status_idx ON missing_reports (institution_id, status);
CREATE INDEX missing_reports_product_idx            ON missing_reports (product_id, status);
CREATE INDEX missing_reports_reported_idx           ON missing_reports (reported_at);

CREATE TABLE found_reports (
  id                      TEXT PRIMARY KEY,
  institution_id          TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  product_id              TEXT REFERENCES products(id) ON DELETE SET NULL,
  token_scanned           TEXT,
  reporter_id             TEXT REFERENCES users(id) ON DELETE SET NULL,
  finder_name             TEXT,
  finder_contact          TEXT,
  location                TEXT,
  found_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  description             TEXT,
  status                  TEXT NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','MATCHED','RETURNED','DISPOSED')),
  matched_missing_report_id TEXT REFERENCES missing_reports(id) ON DELETE SET NULL,
  matched_at              TIMESTAMPTZ,
  returned_at             TIMESTAMPTZ,
  return_notes            TEXT,
  custody_location        TEXT,
  handled_by_id           TEXT
);
CREATE INDEX found_reports_institution_status_idx ON found_reports (institution_id, status);
CREATE INDEX found_reports_product_idx            ON found_reports (product_id);

-- ---------------------------------------------------------------------------
-- Checkpoint verification
-- ---------------------------------------------------------------------------

CREATE TABLE checkpoints (
  id            TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  location      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, name)
);

CREATE TABLE scan_events (
  id             TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  checkpoint_id  TEXT REFERENCES checkpoints(id) ON DELETE SET NULL,
  product_id     TEXT REFERENCES products(id) ON DELETE SET NULL,
  token_scanned  TEXT NOT NULL,
  scanned_by_id  TEXT NOT NULL REFERENCES users(id),
  result         TEXT NOT NULL
                   CHECK (result IN ('REGISTERED_OK','AUTHORIZED_BORROWER','ACTIVE_MISSING_REPORT','NOT_REGISTERED','MISMATCH')),
  source         TEXT NOT NULL DEFAULT 'LIVE'
                   CHECK (source IN ('LIVE','OFFLINE_CACHE','MANUAL_ENTRY')),
  -- Carrier identity is optional: it is recorded ONLY when an officer actually
  -- checks an ID. A NULL carrier means "device scanned, carrier not checked".
  carrier_id     TEXT,
  carrier_name   TEXT,
  carrier_id_shown BOOLEAN NOT NULL DEFAULT FALSE,
  note           TEXT,
  duration_ms    INTEGER,
  scanned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_batch_id  TEXT
);
CREATE INDEX scan_events_institution_time_idx ON scan_events (institution_id, recorded_at);
CREATE INDEX scan_events_product_time_idx     ON scan_events (product_id, recorded_at);
CREATE INDEX scan_events_carrier_time_idx     ON scan_events (carrier_id, recorded_at);
CREATE INDEX scan_events_officer_time_idx     ON scan_events (scanned_by_id, recorded_at);
CREATE INDEX scan_events_result_time_idx      ON scan_events (result, recorded_at);

-- ---------------------------------------------------------------------------
-- Notifications, audit, governance
-- ---------------------------------------------------------------------------

CREATE TABLE notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel    TEXT NOT NULL DEFAULT 'IN_APP' CHECK (channel IN ('IN_APP','EMAIL')),
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  link       TEXT,
  sent_at    TIMESTAMPTZ,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, read_at);

CREATE TABLE audit_logs (
  id            TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  actor_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_role    TEXT,
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  -- justification is mandatory when staff pull an individual's scan history.
  justification TEXT,
  metadata      JSONB,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_institution_time_idx ON audit_logs (institution_id, created_at);
CREATE INDEX audit_logs_entity_idx           ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_actor_idx            ON audit_logs (actor_id, created_at);

CREATE TABLE consent_records (
  id        TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type      TEXT NOT NULL CHECK (type IN ('TERMS_OF_USE','PRIVACY_NOTICE','PILOT_PARTICIPATION','DATA_PROCESSING')),
  version   TEXT NOT NULL,
  accepted  BOOLEAN NOT NULL,
  ip        TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX consent_records_user_idx ON consent_records (user_id, type);

-- Data-subject requests (access / export / deletion / correction / objection)
-- under Proclamation No. 1321/2024.
CREATE TABLE data_subject_requests (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'RECEIVED'
                 CHECK (status IN ('RECEIVED','IN_PROGRESS','COMPLETED','REJECTED')),
  details      TEXT,
  handled_by_id TEXT,
  resolution   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX data_subject_requests_user_idx ON data_subject_requests (user_id, created_at);

CREATE TABLE institution_settings (
  id            TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  value         TEXT NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, key)
);

-- Pre-pilot baseline measured from the university's own records. Without these
-- numbers the pilot cannot demonstrate improvement.
CREATE TABLE baseline_metrics (
  id                   TEXT PRIMARY KEY,
  institution_id       TEXT NOT NULL,
  period_start         TIMESTAMPTZ NOT NULL,
  period_end           TIMESTAMPTZ NOT NULL,
  incidents_reported   INTEGER NOT NULL,
  incidents_recovered  INTEGER NOT NULL,
  median_recovery_hours REAL,
  source               TEXT NOT NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX baseline_metrics_institution_idx ON baseline_metrics (institution_id, period_start);

-- Retention job bookkeeping.
CREATE TABLE retention_runs (
  id            TEXT PRIMARY KEY,
  institution_id TEXT,
  ran_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  scan_events_deleted  INTEGER NOT NULL DEFAULT 0,
  notifications_deleted INTEGER NOT NULL DEFAULT 0,
  sessions_deleted      INTEGER NOT NULL DEFAULT 0,
  reports_anonymised    INTEGER NOT NULL DEFAULT 0,
  audit_logs_deleted    INTEGER NOT NULL DEFAULT 0,
  notes         TEXT
);

COMMIT;
