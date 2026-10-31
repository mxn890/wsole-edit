begin;
create table if not exists public.jogglers_newsletter (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(btrim(name)) between 2 and 100),
 email text not null unique check(length(email)<=254 and email=lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 phone text not null default '' check(phone='' or phone ~ '^[+0-9 ()-]{10,18}$'),
 consent boolean not null check(consent=true),
 created_at timestamptz not null default now()
);
alter table public.jogglers_newsletter enable row level security;
revoke all on public.jogglers_newsletter from anon,authenticated;
grant insert(name,email,phone,consent) on public.jogglers_newsletter to anon,authenticated;
grant select on public.jogglers_newsletter to authenticated;
drop policy if exists newsletter_signup on public.jogglers_newsletter;
create policy newsletter_signup on public.jogglers_newsletter for insert to anon,authenticated with check(consent=true);
drop policy if exists newsletter_owner_read on public.jogglers_newsletter;
create policy newsletter_owner_read on public.jogglers_newsletter for select to authenticated using((select private.is_admin()));
commit;
