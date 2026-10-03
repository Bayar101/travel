-- Trip planner schema. Server-only access via service role key (RLS on, no policies).

create extension if not exists btree_gist;

do $$
begin
  create type location_type as enum ('area', 'place');
exception when duplicate_object then null;
end $$;

-- ---------- tables ----------

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  emoji text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  type location_type not null,
  parent_id uuid references locations (id) on delete cascade,
  category_id uuid references categories (id) on delete set null,
  name text not null,
  description text,
  emoji text not null default '📍',
  city text not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_area_no_parent check (type = 'place' or parent_id is null)
);

create table if not exists days (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  title text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stays (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations (id) on delete cascade,
  name text not null,
  airbnb_url text not null,
  check_in date not null,
  check_out date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stays_dates_order check (check_out > check_in),
  constraint stays_no_overlap exclude using gist ((daterange(check_in, check_out, '[)')) with &&)
);

create table if not exists day_items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references days (id) on delete cascade,
  location_id uuid references locations (id) on delete cascade,
  time time,
  position int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint day_items_location_or_note check (location_id is not null or note is not null)
);

create table if not exists data_version (
  id int primary key default 1 check (id = 1),
  version bigint not null
);
insert into data_version (id, version) values (1, 0) on conflict (id) do nothing;

-- ---------- indexes on FKs ----------

create index if not exists locations_parent_id_idx on locations (parent_id);
create index if not exists locations_category_id_idx on locations (category_id);
create index if not exists stays_location_id_idx on stays (location_id);
create index if not exists day_items_day_id_idx on day_items (day_id);
create index if not exists day_items_location_id_idx on day_items (location_id);

-- ---------- functions ----------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function check_location_parent() returns trigger
language plpgsql as $$
begin
  if new.parent_id is not null then
    if not exists (select 1 from locations where id = new.parent_id and type = 'area') then
      raise exception 'parent_id must reference a location of type area'
        using errcode = 'check_violation';
    end if;
  end if;
  -- an area that still has children cannot become a place
  if tg_op = 'UPDATE' and new.type = 'place' and old.type = 'area'
     and exists (select 1 from locations where parent_id = new.id) then
    raise exception 'area with places cannot become a place'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create or replace function bump_data_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update data_version set version = version + 1 where id = 1;
  return null;
end $$;

-- ---------- triggers ----------

drop trigger if exists locations_check_parent on locations;
create trigger locations_check_parent
  before insert or update of parent_id, type on locations
  for each row execute function check_location_parent();

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'locations', 'stays', 'days', 'day_items'] loop
    execute format('drop trigger if exists %I on %I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on %I for each row execute function set_updated_at()',
      t || '_set_updated_at', t);

    execute format('drop trigger if exists %I on %I', t || '_bump_version', t);
    execute format(
      'create trigger %I after insert or update or delete on %I for each statement execute function bump_data_version()',
      t || '_bump_version', t);
  end loop;
end $$;

-- ---------- RLS: enabled, no policies (anon key gets nothing) ----------

alter table categories enable row level security;
alter table locations enable row level security;
alter table days enable row level security;
alter table stays enable row level security;
alter table day_items enable row level security;
alter table data_version enable row level security;
