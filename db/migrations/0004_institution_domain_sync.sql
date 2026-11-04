-- 0004 · Keep institution_domains and institutions.email_domain in step
--
-- Migration 0003 made institution_domains the single source of truth for "which
-- organisation does this email address belong to". Anything that inserts a row
-- into institutions directly — a script, a future migration, an operator with
-- psql — therefore creates an organisation that nobody can register or sign in
-- to, because the domain lookup finds nothing.
--
-- The load-test harness hit exactly this: it seeds its throwaway institution
-- with plain SQL, and its officer's login then failed with 401.
--
-- institutions.email_domain stays the organisation's canonical primary domain
-- (it is what the UI shows and what the approval flow derives admin@<domain>
-- from). institution_domains is the lookup index built from it. This trigger
-- keeps the two consistent instead of relying on every writer remembering to
-- insert both rows.
--
-- It is deliberately strict: claiming a domain that already belongs to a
-- different organisation raises a duplicate-key error rather than silently
-- re-pointing it at the new tenant.

-- Ids are generated in SQL here because the trigger has no Node beside it.
-- pgcrypto is not installed and does not need to be: 20 characters from the
-- same alphabet src/lib/ids.ts uses is enough for a primary key of domain rows.
CREATE OR REPLACE FUNCTION cg_random_id(prefix TEXT) RETURNS TEXT
LANGUAGE sql VOLATILE AS $$
  SELECT prefix || '_' || string_agg(
    substr('0123456789abcdefghijklmnopqrstuvwxyz', 1 + (random() * 35)::int, 1), '')
  FROM generate_series(1, 20);
$$;

CREATE OR REPLACE FUNCTION cg_sync_institution_email_domain() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_domain TEXT := lower(btrim(NEW.email_domain));
  v_owner  TEXT;
BEGIN
  IF v_domain IS NULL OR v_domain = '' THEN
    RETURN NEW;
  END IF;

  SELECT institution_id INTO v_owner
    FROM institution_domains
   WHERE domain = v_domain;

  IF v_owner IS NULL THEN
    INSERT INTO institution_domains (id, institution_id, domain, is_primary)
    VALUES (cg_random_id('ind'), NEW.id, v_domain, true)
    ON CONFLICT (domain) DO NOTHING;
  ELSIF v_owner = NEW.id THEN
    UPDATE institution_domains
       SET is_primary = true
     WHERE domain = v_domain;
  ELSE
    RAISE EXCEPTION 'email domain % is already claimed by organisation %', v_domain, v_owner
      USING ERRCODE = '23505';
  END IF;

  -- Renaming the organisation's primary domain demotes the old one rather than
  -- dropping it: it may have been added separately, and the addresses in audit
  -- logs and on old QR labels outlive the rename.
  IF TG_OP = 'UPDATE' AND lower(btrim(OLD.email_domain)) IS DISTINCT FROM v_domain THEN
    UPDATE institution_domains
       SET is_primary = false
     WHERE institution_id = NEW.id
       AND domain = lower(btrim(OLD.email_domain))
       AND is_primary;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cg_institution_domain_sync ON institutions;
CREATE TRIGGER cg_institution_domain_sync
  AFTER INSERT OR UPDATE OF email_domain ON institutions
  FOR EACH ROW EXECUTE FUNCTION cg_sync_institution_email_domain();

-- Anything written before this trigger existed (or before 0003 was applied)
-- still needs its domain row.
INSERT INTO institution_domains (id, institution_id, domain, is_primary)
SELECT cg_random_id('ind'), i.id, lower(btrim(i.email_domain)), true
  FROM institutions i
 WHERE i.email_domain IS NOT NULL
   AND btrim(i.email_domain) <> ''
   AND NOT EXISTS (
     SELECT 1 FROM institution_domains d WHERE d.institution_id = i.id AND d.domain = lower(btrim(i.email_domain))
   )
   AND NOT EXISTS (
     SELECT 1 FROM institution_domains d WHERE d.domain = lower(btrim(i.email_domain))
   );
