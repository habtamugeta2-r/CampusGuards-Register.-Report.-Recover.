-- Serial numbers are NOT globally unique in the real world.
--
-- The initial schema put a UNIQUE constraint on product_identifiers.value,
-- which meant two students could not register devices that share a serial
-- (common for grey-market phones, generic chargers, and devices where the
-- student typed the model number instead). Worse, it turned a legitimate
-- duplicate into a 409 error at registration time.
--
-- QR tokens must stay globally unique — that is the whole point of the opaque
-- code — but only among QR tokens.

BEGIN;

ALTER TABLE product_identifiers DROP CONSTRAINT IF EXISTS product_identifiers_value_key;

-- One QR token maps to one product, for ever, including after it is revoked.
CREATE UNIQUE INDEX product_identifiers_qr_token_uniq
  ON product_identifiers (value)
  WHERE kind = 'QR_TOKEN';

-- Serial numbers and asset tags are searchable but repeatable. A repeated
-- serial is a useful fraud signal, so the application surfaces it rather than
-- rejecting it.
CREATE INDEX product_identifiers_value_idx ON product_identifiers (kind, value);

COMMIT;
