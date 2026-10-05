-- Google Maps place cid (decimal, up to 2^64-1: kept as text). Directions open the named place
-- when set; null falls back to the lat/lng pin.
alter table locations add column if not exists google_cid text
  constraint locations_google_cid_digits check (google_cid ~ '^[0-9]{1,20}$');
