alter table public.customers add column if not exists crm_profile jsonb not null default '{}'::jsonb;
grant insert,update on public.customers to authenticated;
create policy customers_editor_insert on public.customers for insert to authenticated with check(app_private.is_tenant_editor(tenant_id));
create policy customers_editor_update on public.customers for update to authenticated using(app_private.is_tenant_editor(tenant_id)) with check(app_private.is_tenant_editor(tenant_id));
alter table public.campaigns add column if not exists voucher_code text;
update public.campaigns set voucher_code='LOY-'||upper(left(id::text,6)) where voucher_code is null;
create unique index if not exists campaigns_voucher_code on public.campaigns(tenant_id,voucher_code);
create or replace function public.issue_voucher_batch(p_tenant uuid,p_quantity integer,p_type text,p_value numeric,p_title text,p_description text,p_expires_at timestamptz,p_customer uuid default null)
returns setof public.campaigns language plpgsql security invoker set search_path='' as $f$
declare c public.customers%rowtype; n integer; vid uuid;
begin
 if not app_private.is_tenant_editor(p_tenant) then raise exception 'Operador sem permissão'; end if;
 if p_quantity not between 1 and 100 or length(trim(p_title))<2 or p_expires_at is null or p_expires_at<=now() then raise exception 'Informe quantidade de 1 a 100, título e prazo futuro'; end if;
 if p_type not in('voucher_10','product_discount','free_delivery') or p_value is null or (p_type<>'free_delivery' and p_value<=0) or (p_type='voucher_10' and p_value>100) then raise exception 'Valor do voucher inválido'; end if;
 if p_customer is not null then select * into c from public.customers where id=p_customer and tenant_id=p_tenant; if not found then raise exception 'Cliente inválido'; end if; end if;
 for n in 1..p_quantity loop
 vid:=gen_random_uuid();
 return query insert into public.campaigns(id,tenant_id,voucher_code,customer_id,customer_phone,customer_name,type,title,description,discount_percent,discount_amount,active,used,expires_at)
 values(vid,p_tenant,'LOY-'||upper(left(replace(vid::text,'-',''),10)),c.id,coalesce(c.phone,''),coalesce(c.name,''),p_type,trim(p_title),left(coalesce(p_description,''),2000),case when p_type='voucher_10' then p_value else 0 end,case when p_type='product_discount' then p_value else 0 end,true,false,p_expires_at) returning *;
 end loop;
end $f$;
revoke all on function public.issue_voucher_batch(uuid,integer,text,numeric,text,text,timestamptz,uuid) from public,anon;
grant execute on function public.issue_voucher_batch(uuid,integer,text,numeric,text,text,timestamptz,uuid) to authenticated;
create or replace function public.save_delivery_neighborhoods(p_tenant uuid,p_rows jsonb)
returns setof public.delivery_fees language plpgsql security invoker set search_path='' as $f$
declare row jsonb; existing uuid;
begin
 if not app_private.is_tenant_editor(p_tenant) then raise exception 'Operador sem permissão'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 200 then raise exception 'Lista de bairros inválida'; end if;
 for row in select value from jsonb_array_elements(p_rows) loop
 if length(trim(row->>'name'))<2 or (row->>'fee')::numeric<0 or (row->>'lat')::numeric not between -90 and 90 or (row->>'lng')::numeric not between -180 and 180 then raise exception 'Bairro, coordenadas ou taxa inválidos'; end if;
 existing:=nullif(row->>'id','')::uuid;
 if existing is null then
 return query insert into public.delivery_fees(tenant_id,name,fee,lat,lng,description,active)
 values(p_tenant,trim(row->>'name'),(row->>'fee')::numeric,(row->>'lat')::numeric,(row->>'lng')::numeric,row->>'description',true) returning *;
 else
 return query update public.delivery_fees set name=trim(row->>'name'),fee=(row->>'fee')::numeric,lat=(row->>'lat')::numeric,lng=(row->>'lng')::numeric,description=row->>'description',updated_at=now() where id=existing and tenant_id=p_tenant returning *;
 if not found then raise exception 'Bairro não encontrado nesta empresa'; end if;
 end if;
 end loop;
end $f$;
revoke all on function public.save_delivery_neighborhoods(uuid,jsonb) from public,anon;
grant execute on function public.save_delivery_neighborhoods(uuid,jsonb) to authenticated;
update public.menu set name='Suco natural',updated_at=now() where code='b-suco';
update public.inventory set name=replace(name,'Suco Tropical','Suco natural'),updated_at=now() where code='ing-suco' or code like 'ing-suco--%';
