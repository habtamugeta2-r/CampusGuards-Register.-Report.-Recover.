-- 0003 · Multi-tenancy: one platform, many organisations
--
-- CampusGuard was prototyped for a single university, but a registry is only
-- useful if it can hold more than one organisation: several universities in a
-- country, colleges and TVET institutes, and — because the same four
-- capabilities (register, report, verify, authorise) apply to any employer
-- that issues laptops — companies and government offices.
--
-- The tenant boundary was already institutions + institution_id on every
-- table. This migration makes that boundary operable from outside:
--
--   * organisations are typed (kind) and have a lifecycle (status) and a
--     licence, so the platform can be sold and operated rather than hand-held;
--   * an organisation can claim more than one email domain (universities
--     routinely have several; companies have subsidiaries);
--   * there is a platform operator role that is deliberately NOT an
--     institution role, and its actions are logged outside any tenant;
--   * organisations can apply to join, and the platform approves them.
--
-- Deliberately NOT done here: per-tenant databases or schemas. One schema with
-- a tenant key on every table is the right trade-off at this size (see
-- ADR-0007), and splitting later is a data-migration, not a rewrite, because
-- every query already carries institution_id.

-- ---------------------------------------------------------------------------
-- Organisation type, lifecycle, licence and residency
-- ---------------------------------------------------------------------------

ALTER TABLE institutions
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'UNIVERSITY'
    CHECK (kind IN ('UNIVERSITY','COLLEGE','TVET','SCHOOL','COMPANY','GOVERNMENT','NGO','OTHER')),
  ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('TRIAL','ACTIVE','SUSPENDED','CLOSED')),
  -- NULL means "no agreed end date" (a perpetual or in-kind arrangement).
  ADD COLUMN licence_expires_at TIMESTAMPTZ,
  -- NULL means unlimited. Enforced at registration, not at sign-in: an
  -- organisation that is over its seat count must not be locked out of the
  -- data it already holds.
  ADD COLUMN seat_limit INTEGER,
  ADD COLUMN logo_url TEXT,
  -- Where this tenant's data must physically live. Personal data collected in
  -- a country generally has to stay in that country (in Ethiopia: Proclamation
  -- 1321/2024 Art. 22), so residency is a per-tenant property, not a platform
  -- one. A national rollout keeps one deployment per region.
  ADD COLUMN data_region TEXT NOT NULL DEFAULT 'Ethiopia';

CREATE INDEX institutions_status_idx ON institutions (status);
CREATE INDEX institutions_kind_idx ON institutions (kind);

-- ---------------------------------------------------------------------------
-- Email domains: many per organisation, unique across the platform
-- ---------------------------------------------------------------------------

CREATE TABLE institution_domains (
  id             TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  domain         TEXT NOT NULL UNIQUE,
  is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX institution_domains_institution_idx ON institution_domains (institution_id);

-- Carry the existing single domain across so lookups have one source of truth.
INSERT INTO institution_domains (id, institution_id, domain, is_primary, verified_at)
SELECT 'ind_' || substr(md5(random()::text || i.id), 1, 20), i.id, lower(i.email_domain), TRUE, now()
  FROM institutions i;

-- ---------------------------------------------------------------------------
-- Platform operators
-- ---------------------------------------------------------------------------
--
-- A platform operator is a real user (so sessions, lockout, password policy
-- and audit all work unchanged) who additionally holds a platform_role. They
-- still belong to an institution — the operating company's own tenant — which
-- keeps the "every row has an institution" invariant intact. institution_id
-- is therefore never nullable, and cross-tenant actions are an explicit,
-- audited escalation rather than a side effect of a missing tenant.

ALTER TABLE users
  ADD COLUMN platform_role TEXT NOT NULL DEFAULT 'NONE'
    CHECK (platform_role IN ('NONE','PLATFORM_ADMIN'));

CREATE INDEX users_platform_role_idx ON users (platform_role) WHERE platform_role <> 'NONE';

-- ---------------------------------------------------------------------------
-- Applications to join the platform
-- ---------------------------------------------------------------------------

CREATE TABLE institution_requests (
  id                     TEXT PRIMARY KEY,
  organisation_name      TEXT NOT NULL,
  kind                   TEXT NOT NULL
                           CHECK (kind IN ('UNIVERSITY','COLLEGE','TVET','SCHOOL','COMPANY','GOVERNMENT','NGO','OTHER')),
  country                TEXT NOT NULL DEFAULT 'Ethiopia',
  city                   TEXT,
  contact_name           TEXT NOT NULL,
  contact_email          TEXT NOT NULL,
  primary_domain         TEXT NOT NULL,
  extra_domains          TEXT[] NOT NULL DEFAULT '{}',
  estimated_people       INTEGER,
  message                TEXT,
  status                 TEXT NOT NULL DEFAULT 'NEW'
                           CHECK (status IN ('NEW','APPROVED','REJECTED')),
  reviewed_by_user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at            TIMESTAMPTZ,
  review_notes           TEXT,
  created_institution_id TEXT REFERENCES institutions(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX institution_requests_status_idx ON institution_requests (status, created_at DESC);

-- One open application per organisation name, so the review queue does not
-- fill with duplicates when someone refreshes the form.
CREATE UNIQUE INDEX institution_requests_open_name_uniq
  ON institution_requests (lower(organisation_name))
  WHERE status = 'NEW';

-- ---------------------------------------------------------------------------
-- Platform audit log
-- ---------------------------------------------------------------------------
--
-- Kept separate from audit_logs on purpose: those rows belong to a tenant and
-- are visible to that tenant's administrators. Creating, suspending or
-- re-licensing an organisation is not that organisation's business, and a
-- platform operator's actions must be reviewable by someone outside the tenant.

CREATE TABLE platform_audit_logs (
  id             TEXT PRIMARY KEY,
  actor_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_email    TEXT NOT NULL,
  action         TEXT NOT NULL,
  entity_type    TEXT,
  entity_id      TEXT,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip             TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX platform_audit_logs_created_idx ON platform_audit_logs (created_at DESC);
CREATE INDEX platform_audit_logs_entity_idx ON platform_audit_logs (entity_type, entity_id);

COMMENT ON TABLE platform_audit_logs IS
  'Actions taken by platform operators across tenants. Never contains personal data about students.';
