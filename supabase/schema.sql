-- Run setup.sql once in the Supabase SQL Editor. No service-role key is used by the website.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create table if not exists private.jogglers_admin_emails(email text primary key);
insert into private.jogglers_admin_emails values ('OWNER_EMAIL_HERE') on conflict do nothing;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join private.jogglers_admin_emails a on a.email=lower(u.email) where u.id=auth.uid() and u.email_confirmed_at is not null);
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon,authenticated;
create table if not exists public.jogglers_catalog_data(id integer primary key check(id=1),value jsonb not null,version integer not null default 1);
create table if not exists public.jogglers_orders(ref text primary key,value jsonb not null,created_at timestamptz not null default now());
create unique index if not exists jogglers_order_key on public.jogglers_orders((value->>'key'));
alter table public.jogglers_catalog_data enable row level security;
alter table public.jogglers_orders enable row level security;
revoke all on public.jogglers_catalog_data,public.jogglers_orders from anon,authenticated;
grant select,update on public.jogglers_catalog_data to authenticated;
grant select on public.jogglers_orders to authenticated;
drop policy if exists jogglers_catalog_owner on public.jogglers_catalog_data;
create policy jogglers_catalog_owner on public.jogglers_catalog_data for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
drop policy if exists jogglers_order_owner on public.jogglers_orders;
create policy jogglers_order_owner on public.jogglers_orders for select to authenticated using((select private.is_admin()));

create or replace function private.catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('products',coalesce((select jsonb_agg(p) from jsonb_array_elements(value->'products') p where p->>'active'='true'),'[]'::jsonb),'categories',value->'categories') from public.jogglers_catalog_data where id=1;
$$;
create or replace function public.jogglers_catalog() returns jsonb language sql stable security invoker set search_path='' as $$select private.catalog()$$;
create or replace function public.jogglers_is_admin() returns boolean language sql stable security invoker set search_path='' as $$select private.is_admin()$$;

create or replace function private.safe_order(o jsonb) returns jsonb language sql immutable set search_path='' as $$select o-'customer'-'key'$$;
create or replace function private.place_order(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c jsonb='{}'; k text; v text; cat jsonb; ps jsonb; p jsonb; item jsonb; items jsonb='[]'; ord jsonb; existing jsonb; idx integer; qty integer; subtotal numeric=0; delivery numeric; size jsonb;
begin
 if octet_length(payload::text)>30000 then raise exception 'Order is too large.'; end if;
 foreach k in array array['name','email','phone','address','address2','city','province','postal','notes'] loop
  v=btrim(coalesce(payload->>k,'')); if length(v)>(case when k='notes' then 1000 else 200 end) then raise exception 'Delivery details are too long.'; end if;
  c=c||jsonb_build_object(k,v);
 end loop;
 c=jsonb_set(c,'{email}',to_jsonb(lower(c->>'email')));
 if c->>'name'='' or c->>'address'='' or c->>'city'='' or c->>'province'='' or (c->>'email')!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or (c->>'phone')!~'^[+0-9 ()-]{10,18}$' or (c->>'postal')!~'^[0-9]{5}$' then raise exception 'Complete valid delivery details.'; end if;
 if coalesce(payload->>'key','')!~'^[A-Za-z0-9_-]{20,80}$' then raise exception 'Invalid order request.'; end if;
 -- Serializing catalog changes also prevents duplicate checkout retries deducting stock twice.
 select value into cat from public.jogglers_catalog_data where id=1 for update;
 select value into existing from public.jogglers_orders where value->>'key'=payload->>'key';
 if existing is not null then
  if existing->'customer'->>'email'<>c->>'email' then raise exception 'Invalid order request.'; end if;
  return private.safe_order(existing);
 end if;
 if jsonb_typeof(payload->'items') is distinct from 'array' then raise exception 'Your bag is empty.'; end if;
 if jsonb_array_length(payload->'items') not between 1 and 50 then raise exception 'Your bag is empty or too large.'; end if;
 ps=cat->'products';
 for item in select * from jsonb_array_elements(payload->'items') loop
  p=null; idx=null;
  select x, (n-1)::integer into p,idx from jsonb_array_elements(ps) with ordinality a(x,n) where x->>'id'=item->>'id' and x->>'active'='true';
  if p is null then raise exception 'A product is no longer available.'; end if;
  if coalesce(item->>'qty','')!~'^[0-9]{1,2}$' then raise exception 'Invalid quantity.'; end if;
  qty=(item->>'qty')::integer;
  if qty not between 1 and 10 then raise exception 'Invalid quantity.'; end if;
  if (p->>'stock')::integer<qty then raise exception 'A product has insufficient stock.'; end if;
  if jsonb_array_length(p->'sizes')=0 then size='"One size"'; else
   select x into size from jsonb_array_elements(p->'sizes') x where x#>>'{}'=item->>'size';
   if size is null then raise exception 'Choose an available size.'; end if;
  end if;
  items=items||jsonb_build_array(jsonb_build_object('id',p->'id','size',size,'qty',qty,'snapshot',p));
  subtotal=subtotal+(p->>'price')::numeric*qty;
  ps=jsonb_set(ps,array[idx::text,'stock'],to_jsonb((p->>'stock')::integer-qty));
 end loop;
 delivery=case when subtotal>=5000 then 0 else 250 end;
 ord=jsonb_build_object('ref','JG-'||upper(gen_random_uuid()::text),'name',c->>'name','customer',c,'items',items,'total',subtotal+delivery,'shipping',delivery,'status','Received','date',now(),'key',payload->>'key');
 insert into public.jogglers_orders(ref,value) values(ord->>'ref',ord);
 update public.jogglers_catalog_data set value=jsonb_set(cat,'{products}',ps),version=version+1 where id=1;
 return private.safe_order(ord);
end;$$;
create or replace function public.jogglers_place_order(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.place_order(payload)$$;
create or replace function private.track_order(order_ref text,order_email text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare o jsonb; begin
 select value into o from public.jogglers_orders where ref=upper(btrim(order_ref)) and value->'customer'->>'email'=lower(btrim(order_email));
 if o is null then raise exception 'No matching order. Check your reference and email.'; end if;
 return private.safe_order(o); end;$$;
create or replace function public.jogglers_track_order(order_ref text,order_email text) returns jsonb language sql stable security invoker set search_path='' as $$select private.track_order(order_ref,order_email)$$;
create or replace function private.update_order(order_ref text,new_status text) returns void language plpgsql security definer set search_path='' as $$
declare o jsonb; cat jsonb; ps jsonb; item jsonb; idx integer; p jsonb;
begin
 if not private.is_admin() then raise exception 'Owner sign-in required.'; end if;
 if new_status not in ('Received','Confirmed','Shipped','Delivered','Cancelled') then raise exception 'Invalid status.'; end if;
 select value into cat from public.jogglers_catalog_data where id=1 for update;
 select value into o from public.jogglers_orders where ref=order_ref for update;
 if o is null then raise exception 'Order not found.'; end if;
 if o->>'status'='Cancelled' and new_status<>'Cancelled' then raise exception 'Cancelled orders cannot be reopened.'; end if;
 if new_status='Cancelled' and o->>'status'<>'Cancelled' then
  ps=cat->'products';
  for item in select * from jsonb_array_elements(o->'items') loop
   select x,(n-1)::integer into p,idx from jsonb_array_elements(ps) with ordinality a(x,n) where x->>'id'=item->>'id';
   if p is not null then ps=jsonb_set(ps,array[idx::text,'stock'],to_jsonb((p->>'stock')::integer+(item->>'qty')::integer)); end if;
  end loop;
  update public.jogglers_catalog_data set value=jsonb_set(cat,'{products}',ps),version=version+1 where id=1;
 end if;
 update public.jogglers_orders set value=jsonb_set(o,'{status}',to_jsonb(new_status)) where ref=order_ref;
end;$$;
create or replace function public.jogglers_update_order(order_ref text,new_status text) returns void language sql security invoker set search_path='' as $$select private.update_order(order_ref,new_status)$$;

revoke all on function private.catalog(),private.place_order(jsonb),private.track_order(text,text),private.update_order(text,text),private.safe_order(jsonb) from public;
grant execute on function private.catalog(),private.place_order(jsonb),private.track_order(text,text),private.safe_order(jsonb) to anon,authenticated;
grant execute on function private.update_order(text,text) to authenticated;
revoke all on function public.jogglers_catalog(),public.jogglers_is_admin(),public.jogglers_place_order(jsonb),public.jogglers_track_order(text,text),public.jogglers_update_order(text,text) from public;
grant execute on function public.jogglers_catalog(),public.jogglers_is_admin(),public.jogglers_place_order(jsonb),public.jogglers_track_order(text,text) to anon,authenticated;
grant execute on function public.jogglers_update_order(text,text) to authenticated;
grant usage on schema public to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('jogglers-images','jogglers-images',true,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists jogglers_image_owner on storage.objects;
create policy jogglers_image_owner on storage.objects for all to authenticated using(bucket_id='jogglers-images' and (select private.is_admin())) with check(bucket_id='jogglers-images' and (select private.is_admin()));
commit;
