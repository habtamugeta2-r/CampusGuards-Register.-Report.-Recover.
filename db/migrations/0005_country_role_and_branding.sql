-- 0005 · Country-level operators, and branding that belongs to the tenant
--
-- Two things a platform needs once it holds more than one organisation.
--
-- 1. A COUNTRY_ADMIN: a ministry, a regulator or a university federation that
--    must be able to answer "how is adoption going, and is the platform
--    actually returning property?" across every organisation in one country —
--    without being handed the contents of any of them. Their grant is scoped
--    to a country, they see aggregates and per-organisation counts, and they
--    cannot provision, licence, suspend or read a single person.
--
--    Scoped in the user row rather than in a separate grants table because a
--    country operator is a person with one country, not a set of permissions
--    to be composed. If that stops being true, this is the column to split
--    out — the guard is already one function.
--
-- 2. Branding. An organisation that prints labels, sends emails and puts a
--    public status page in front of its own people wants them to look like the
--    organisation, not like a product it rented. The colour is a single hex on
--    the tenant; the shades are derived at render time (src/lib/brand.ts), so
--    there is one setting per organisation and not a palette to design.

-- ---------------------------------------------------------------------------
-- Country-scoped platform role
-- ---------------------------------------------------------------------------

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_platform_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_platform_role_check
  CHECK (platform_role IN ('NONE', 'PLATFORM_ADMIN', 'COUNTRY_ADMIN'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_scope_country TEXT;

-- A country operator always has exactly one country; nobody else has a scope.
-- Enforced here so a half-configured grant cannot exist.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_platform_scope_country_check;
ALTER TABLE users
  ADD CONSTRAINT users_platform_scope_country_check
  CHECK ((platform_role = 'COUNTRY_ADMIN') = (platform_scope_country IS NOT NULL));

CREATE INDEX IF NOT EXISTS users_platform_scope_country_idx
  ON users (platform_scope_country)
  WHERE platform_scope_country IS NOT NULL;

-- The country name is the same free-text value institutions.country holds
-- ('Ethiopia'). Exact match, so a typo in either column is invisible scope
-- rather than an error — the platform console shows a country operator how
-- many organisations their scope actually matches, which is the check.

-- ---------------------------------------------------------------------------
-- Branding
-- ---------------------------------------------------------------------------

ALTER TABLE institutions ADD COLUMN IF NOT EXISTS brand_primary TEXT;

ALTER TABLE institutions DROP CONSTRAINT IF EXISTS institutions_brand_primary_check;
ALTER TABLE institutions
  ADD CONSTRAINT institutions_brand_primary_check
  CHECK (brand_primary IS NULL OR brand_primary ~ '^#[0-9a-fA-F]{6}$');

-- NULL means "use the CampusGuard default", so an organisation that never
-- touches this still renders correctly and consistently.
COMMENT ON COLUMN institutions.brand_primary IS
  'Hex colour (#rrggbb) for this organisation’s labels, emails and public pages. NULL = platform default.';
COMMENT ON COLUMN institutions.logo_url IS
  'Shown on labels, emails and the public status page. Hosted by the organisation; never uploaded through this API.';
