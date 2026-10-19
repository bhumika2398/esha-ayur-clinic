-- Esha Ayur Care: admin panel v2
-- Run this whole file once in the Supabase SQL Editor. It is safe to run again:
-- every statement is additive and idempotent, and no existing data is changed or removed.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- New tables
-- ---------------------------------------------------------------------------
create table if not exists public.price_items (
  id          uuid primary key default gen_random_uuid(),
  category    text not null default 'body' check (category in ('body', 'skin', 'womens', 'weight')),
  group_name  text not null default '',
  service     text not null default '',
  duration    text not null default '',
  price       integer check (price is null or price >= 0),
  pkg3        integer check (pkg3 is null or pkg3 >= 0),
  pkg5        integer check (pkg5 is null or pkg5 >= 0),
  pkg7        integer check (pkg7 is null or pkg7 >= 0),
  note        text not null default '',
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.appointment_requests (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  source          text not null default '',
  name            text not null default '',
  phone           text not null default '',
  department      text not null default '',
  treatment       text not null default '',
  visit_type      text not null default '',
  preferred_date  date,
  preferred_time  text not null default '',
  message         text not null default '',
  status          text not null default 'new'
                  check (status in ('new', 'contacted', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes           text not null default '',
  consent         boolean not null default false
);

create table if not exists public.site_settings (
  id             integer primary key default 1 check (id = 1),
  phone_display  text not null default '',
  phone_tel      text not null default '',
  whatsapp       text not null default '',
  email          text not null default '',
  street         text not null default '',
  area           text not null default '',
  city           text not null default '',
  state          text not null default '',
  pincode        text not null default '',
  clinic_hours   text not null default '',
  online_hours   text not null default '',
  maps_url       text not null default '',
  sheet_url      text not null default '',
  show_prices    boolean not null default true,
  pricing_note   text not null default '',
  announcement   text not null default '',
  updated_at     timestamptz not null default now()
);

create table if not exists public.doctor_profile (
  id              integer primary key default 1 check (id = 1),
  name            text not null default '',
  qualification   text not null default '',
  title           text not null default '',
  specialisation  text not null default '',
  experience      text not null default '',
  college         text not null default '',
  languages       text[] not null default '{}',
  registration    text not null default '',
  focus_areas     text[] not null default '{}',
  bio             text[] not null default '{}',
  quote           text not null default '',
  updated_at      timestamptz not null default now()
);

create index if not exists appointment_requests_created_idx on public.appointment_requests (created_at desc);
create index if not exists appointment_requests_phone_idx on public.appointment_requests (phone, created_at desc);
create index if not exists price_items_order_idx on public.price_items (category, sort_order);

-- ---------------------------------------------------------------------------
-- updated_at on content tables (and a trigger that refreshes it)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['treatments', 'faqs', 'testimonials', 'gallery', 'price_items', 'site_settings', 'doctor_profile']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now()', t);
      execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
      execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_set_updated_at', t);
    end if;
  end loop;
end $$;

-- gallery.section: allow 'therapy', 'clinic' and 'doctor'
do $$
declare c record;
begin
  if to_regclass('public.gallery') is not null then
    for c in
      select conname from pg_constraint
      where conrelid = 'public.gallery'::regclass and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%section%'
    loop
      execute format('alter table public.gallery drop constraint %I', c.conname);
    end loop;
    alter table public.gallery
      add constraint gallery_section_check check (section in ('therapy', 'clinic', 'doctor'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Rate limit: one request per phone number every 2 minutes
-- ---------------------------------------------------------------------------
create or replace function public.appointment_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.appointment_requests r
    where regexp_replace(r.phone, '[^0-9]', '', 'g') = regexp_replace(new.phone, '[^0-9]', '', 'g')
      and r.created_at > now() - interval '2 minutes'
  ) then
    raise exception 'rate_limited: please wait 2 minutes before sending another request';
  end if;
  return new;
end $$;

drop trigger if exists appointment_requests_rate_limit on public.appointment_requests;
create trigger appointment_requests_rate_limit
  before insert on public.appointment_requests
  for each row execute function public.appointment_rate_limit();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.price_items           enable row level security;
alter table public.appointment_requests  enable row level security;
alter table public.site_settings         enable row level security;
alter table public.doctor_profile        enable row level security;

-- Public read of active content
do $$
declare t text;
begin
  foreach t in array array['treatments', 'faqs', 'testimonials', 'gallery', 'price_items']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists %I on public.%I', t || '_public_read_v2', t);
      execute format('create policy %I on public.%I for select to anon using (is_active = true)', t || '_public_read_v2', t);
    end if;
  end loop;
end $$;

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings for select to anon using (true);

drop policy if exists doctor_profile_public_read on public.doctor_profile;
create policy doctor_profile_public_read on public.doctor_profile for select to anon using (true);

-- Public can only INSERT appointment requests (never read, change or delete them)
drop policy if exists appointment_requests_public_insert on public.appointment_requests;
create policy appointment_requests_public_insert on public.appointment_requests
  for insert to anon
  with check (
    char_length(name) between 2 and 80
    and phone ~ '^[+0-9 -]{10,16}$'
    and char_length(source) <= 40
    and char_length(department) <= 80
    and char_length(treatment) <= 160
    and char_length(visit_type) <= 40
    and char_length(preferred_time) <= 20
    and char_length(message) <= 1000
    and consent = true
    and status = 'new'
    and char_length(notes) = 0
  );

-- Signed-in clinic staff can do everything
do $$
declare t text;
begin
  foreach t in array array['treatments', 'faqs', 'testimonials', 'gallery', 'price_items',
                           'appointment_requests', 'site_settings', 'doctor_profile', 'publish_requests']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists %I on public.%I', t || '_staff_all_v2', t);
      execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', t || '_staff_all_v2', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.price_items, public.site_settings, public.doctor_profile to anon;
grant insert on public.appointment_requests to anon;
grant select, insert, update, delete on
  public.price_items, public.appointment_requests, public.site_settings, public.doctor_profile
  to authenticated;

-- ---------------------------------------------------------------------------
-- Seed data (only when the table is empty)
-- ---------------------------------------------------------------------------
insert into public.site_settings (
  id, phone_display, phone_tel, whatsapp, email, street, area, city, state, pincode,
  clinic_hours, online_hours, maps_url, sheet_url, show_prices, pricing_note, announcement
)
select 1, '098805 35528', '+919880535528', '919880535528', 'gayathrimadhoo@gmail.com',
       'Amruth Nagar Main Rd, opposite BBMP park, Sonnappa Layout, H A Farm Post',
       'Amruthnagar, Byatarayanapura', 'Bengaluru', 'Karnataka', '560024',
       'Mon to Sat: 10:00 AM to 1:30 PM and 5:30 PM to 8:30 PM',
       'Online consultation: 1:30 PM to 5:30 PM',
       '', '', true,
       'Package rates apply when you book a series of 3, 5 or 7 days. Please ask the clinic for details.',
       ''
where not exists (select 1 from public.site_settings);

insert into public.doctor_profile (id, name, qualification, title)
select 1, 'Dr. Gayathri S', 'BAMS, MD', 'Ayurvedic Physician'
where not exists (select 1 from public.doctor_profile);

do $$
begin
  if not exists (select 1 from public.price_items) then
    insert into public.price_items (sort_order, category, group_name, service, duration, price, pkg3, pkg5, pkg7, note)
    select n, c, g, s, d, p, p3, p5, p7, coalesce(nt, '')
    from (values
      (1,  'body', 'Abhyanga', 'Sarvanga Abhyanga with steam', '1 hr 15 min', 1800, 1800, 1700, 1600, null),
      (2,  'body', 'Abhyanga', 'Sarvanga Abhyanga with steam', '1 hr', 1600, 1500, 1450, 1350, null),
      (3,  'body', 'Abhyanga', 'Ardhanga Abhyanga', '30 min', 1200, 1150, 1100, 1000, null),
      (4,  'body', 'Abhyanga', 'Ardhanga Abhyanga with steam', '45 min', 1500, 1400, 1300, 1200, null),
      (5,  'body', 'Abhyanga', 'Ekanga Abhyanga with steam', '30 min', 900, null, null, null, null),
      (6,  'body', 'Abhyanga', 'Shiro Abhyanga (head)', '20 min', 500, null, null, null, null),
      (7,  'body', 'Abhyanga', 'Mukha Abhyanga (face)', '20 min', 500, null, null, null, null),
      (8,  'body', 'Abhyanga', 'Pada Abhyanga (feet)', '20 min', 800, null, null, null, null),
      (9,  'body', 'Pinda Sweda', 'Sarvanga Patra Pinda Sweda', '50 min', 1800, 1700, 1600, 1500, null),
      (10, 'body', 'Pinda Sweda', 'Ardhanga Abhyanga with Patra Pinda Sweda (PPS)', '1 hr', 2500, 2250, 2150, 2000, 'PPS = Patra Pinda Sweda (confirm with the doctor)'),
      (11, 'body', 'Pinda Sweda', 'Ekanga Abhyanga with Patra Pinda Sweda (PPS)', '30 min', 1000, null, null, null, 'PPS = Patra Pinda Sweda (confirm with the doctor)'),
      (12, 'body', 'Pinda Sweda', 'Sarvanga Abhyanga with SSPS', '1 hr 30 min', 2800, null, null, null, 'SSPS = Shashtika Shali Pinda Sweda (confirm with the doctor)'),
      (13, 'body', 'Pinda Sweda', 'Ardhanga Abhyanga with SSPS', '1 hr', 2000, null, null, null, 'SSPS = Shashtika Shali Pinda Sweda (confirm with the doctor)'),
      (14, 'body', 'Pinda Sweda', 'Ekanga Abhyanga with SSPS', '30 min', 1200, null, null, null, 'SSPS = Shashtika Shali Pinda Sweda (confirm with the doctor)'),
      (15, 'body', 'Pinda Sweda', 'Sarvanga Choorna Pinda Sweda', '1 hr', 1800, null, null, null, null),
      (16, 'body', 'Pinda Sweda', 'Mamsa Pinda Sweda', '1 hr', 2500, null, null, null, null),
      (17, 'body', 'Pinda Sweda', 'Ardhanga Choorna Pinda Sweda (CPS)', '45 min', 1400, null, null, null, 'CPS = Choorna Pinda Sweda (confirm with the doctor)'),
      (18, 'body', 'Pinda Sweda', 'Ekanga Kukkutanda Sweda', '30 min', 1000, null, null, null, null),
      (19, 'body', 'Pinda Sweda', 'Jambeera Sweda (Ekanga)', '30 min', 1000, null, null, null, 'Spelling to confirm (original sheet says Jabeera)'),
      (20, 'body', 'Pinda Sweda', 'Kukkutanda Sweda (Sthanika)', '45 min', 1200, null, null, null, null),
      (21, 'body', 'Udwarthana', 'Sarvanga Udwarthana with steam', '1 hr 15 min', 2000, 1800, 1700, 1600, null),
      (22, 'body', 'Udwarthana', 'Ardhanga Udwarthana with steam', '45 min', 1600, null, null, null, null),
      (23, 'body', 'Local Basti', 'Kati Basti', '45 min', 1300, null, null, null, null),
      (24, 'body', 'Local Basti', 'Greeva Basti', '45 min', 1300, null, null, null, null),
      (25, 'body', 'Local Basti', 'Janu Basti (single knee)', '45 min', 1300, null, null, null, null),
      (26, 'body', 'Local Basti', 'Janu Basti (both knees)', '45 min', 1700, null, null, null, null),
      (27, 'body', 'Shirodhara and Head', 'Shiro Dhara', '45 min', 2000, null, null, null, null),
      (28, 'body', 'Shirodhara and Head', 'Shiro Basti', '1 hr', 2400, null, null, null, null),
      (29, 'body', 'Shirodhara and Head', 'Ksheera Dhara (head)', '45 min', 1700, null, null, null, null),
      (30, 'body', 'Shirodhara and Head', 'Takra Dhara (head)', '45 min', 1700, null, null, null, null),
      (31, 'body', 'Body Dhara', 'Ksheera Dhara (Sarvanga)', '1 hr', 2200, null, null, null, null),
      (32, 'body', 'Body Dhara', 'Takra Dhara (Sarvanga)', '1 hr', 2100, null, null, null, null),
      (33, 'body', 'Body Dhara', 'Sarvanga Kashaya Dhara', '30 min', 1500, null, null, null, null),
      (34, 'body', 'Body Dhara', 'Dhanyamla Dhara (Sarvanga)', '30 min', 1700, null, null, null, null),
      (35, 'body', 'Body Dhara', 'Dhanyamla Dhara (Ardhanga)', '30 min', 1300, null, null, null, null),
      (36, 'body', 'Eye and Nasal', 'Netra Tarpana', '45 min', 1500, null, null, null, null),
      (37, 'body', 'Eye and Nasal', 'Nasya with Dhumapana', '30 min', 1100, null, null, null, null),
      (38, 'body', 'Swedana', 'Ishtika Sweda', '30 min', 1300, null, null, null, null),
      (39, 'body', 'Swedana', 'Valuka Sweda (Sarvanga)', '45 min', 1500, null, null, null, null),
      (40, 'body', 'Swedana', 'Valuka Sweda (Ardhanga)', '30 min', 1000, null, null, null, null),
      (41, 'body', 'Navara Theppu', 'Navara Theppu', '45 min', 1000, null, null, null, null),
      (42, 'body', 'Jaloukavacharana', 'Jaloukavacharana', '1 hr', 1000, null, null, null, null),
      (43, 'body', 'Panchakarma', 'Matra Basti', '20 min', 1000, null, null, null, null),
      (44, 'body', 'Panchakarma', 'Kashaya Basti', '45 min', 1500, null, null, null, null),
      (45, 'body', 'Panchakarma', 'Virechana', '', 10500, null, null, null, null),
      (46, 'body', 'Panchakarma', 'Vamana', '', 10500, null, null, null, null),
      (47, 'skin', 'Facials', 'Navara Facial', '', 1200, null, null, null, null),
      (48, 'skin', 'Facials', 'Kunkumadi Taila Facial', '', 1200, null, null, null, null),
      (49, 'womens', 'Women''s Care', 'Yoni Pichu', '', 1000, null, null, null, null),
      (50, 'womens', 'Women''s Care', 'Yoni Prakshalana', '', 1000, null, null, null, null),
      (51, 'weight', 'Weight Reduction Package', 'Udwarthana followed by Virechana', '', 16500, null, null, null, null),
      (52, 'weight', 'Weight Reduction Package', 'Udwarthana followed by Vamana', '', null, null, null, null, 'Price to be confirmed')
    ) as v(n, c, g, s, d, p, p3, p5, p7, nt);
  end if;
end $$;
