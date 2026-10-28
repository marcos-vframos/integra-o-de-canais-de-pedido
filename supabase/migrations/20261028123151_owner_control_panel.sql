-- Owner-only records; existing orders, stock, customers and settings remain canonical.
create or replace function app_private.is_control_owner(p_tenant uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.tenant_memberships m where m.tenant_id=p_tenant and m.user_id=(select auth.uid()) and m.active and m.role='owner');
$$;
revoke all on function app_private.is_control_owner(uuid) from public,anon;
grant execute on function app_private.is_control_owner(uuid) to authenticated;
create table public.control_records(
 id uuid primary key,tenant_id uuid not null references public.tenants(id),kind text not null,
 data jsonb not null check(jsonb_typeof(data)='object'),revision integer not null default 1 check(revision>0),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 constraint control_kind_check check(kind in ('expense','payable','receivable','opening','reconciliation','lead','interaction','quality','goal','alert','cost','loss'))
);
create index control_records_tenant_kind_idx on public.control_records(tenant_id,kind,created_at desc);
create index control_records_creator_idx on public.control_records(created_by);
create unique index control_one_opening_idx on public.control_records(tenant_id) where kind='opening';
alter table public.control_records enable row level security;
revoke all on public.control_records from public,anon,authenticated;
grant select on public.control_records to authenticated;
create policy control_owner_read on public.control_records for select to authenticated using(app_private.is_control_owner(tenant_id));
create or replace function public.control_access(p_tenant uuid)
returns boolean language sql stable security invoker set search_path='' as $$select app_private.is_control_owner(p_tenant);$$;
revoke all on function public.control_access(uuid) from public,anon;
grant execute on function public.control_access(uuid) to authenticated;

-- Explicit authorization, optimistic revisions, atomic stock losses and immutable audit.
create or replace function public.save_control_record(p_tenant uuid,p_id uuid,p_kind text,p_data jsonb,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.control_records%rowtype; saved public.control_records%rowtype; item public.inventory%rowtype; quantity numeric;
begin
 if not app_private.is_control_owner(p_tenant) then raise exception 'Acesso exclusivo ao proprietário desta empresa'; end if;
 if p_id is null or p_expected_revision is null or p_expected_revision<0 or p_kind is null or p_kind not in ('expense','payable','receivable','opening','reconciliation','lead','interaction','quality','goal','alert','cost','loss') or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>32768 or length(trim(coalesce(p_data->>'name',''))) not between 2 and 160 then raise exception 'Registro inválido'; end if;
 if p_kind in ('expense','payable','receivable','opening','cost','loss') and coalesce(p_data->>'amount','') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$' then raise exception 'Valor monetário inválido'; end if;
 if p_kind in ('expense','payable','receivable','opening') then
  if coalesce(p_data->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Data inválida'; end if;
  perform (p_data->>'date')::date;
  if coalesce(p_data->>'status','') not in ('open','settled','void') then raise exception 'Situação financeira inválida'; end if;
 end if;
 if p_kind='opening' and p_data->>'status'<>'settled' then raise exception 'O saldo inicial deve ser confirmado'; end if;
 select * into old from public.control_records where tenant_id=p_tenant and id=p_id for update;
 if found then
  if old.kind<>p_kind or old.revision<>p_expected_revision then raise exception 'Registro alterado em outra tela. Atualize e confira antes de salvar'; end if;
  if p_kind='loss' then
   if old.data->>'status'='void' or p_data is distinct from (old.data||jsonb_build_object('status','void')) then raise exception 'Uma perda só pode ser estornada integralmente'; end if;
   update public.inventory set qty=qty+(old.data->>'qty')::numeric,updated_at=clock_timestamp() where tenant_id=p_tenant and id=(old.data->>'inventoryId')::uuid;
   if not found then raise exception 'Item de estoque não encontrado'; end if;
  end if;
  update public.control_records set data=p_data,revision=revision+1,updated_at=clock_timestamp() where tenant_id=p_tenant and id=p_id returning * into saved;
 else
  if p_expected_revision<>0 then raise exception 'Registro não encontrado nesta empresa'; end if;
  if p_kind='loss' then
   quantity:=(p_data->>'qty')::numeric;
   if quantity is null or quantity<=0 or quantity::text in ('NaN','Infinity','-Infinity') or p_data->>'status'='void' then raise exception 'Quantidade de perda inválida'; end if;
   select * into item from public.inventory where tenant_id=p_tenant and id=(p_data->>'inventoryId')::uuid for update;
   if not found or item.qty<quantity then raise exception 'Item ausente ou estoque insuficiente para esta perda'; end if;
   update public.inventory set qty=qty-quantity,updated_at=clock_timestamp() where id=item.id and tenant_id=p_tenant;
  end if;
  insert into public.control_records(id,tenant_id,kind,data,created_by) values(p_id,p_tenant,p_kind,p_data,auth.uid()) returning * into saved;
 end if;
 insert into public.operation_audit(tenant_id,operator_id,action,record_id,details) values(p_tenant,auth.uid(),case when p_expected_revision=0 then 'control_create' else 'control_update' end,p_id,jsonb_build_object('kind',p_kind,'before',old.data,'after',saved.data,'revision',saved.revision));
 return to_jsonb(saved);
end;$$;
revoke all on function public.save_control_record(uuid,uuid,text,jsonb,integer) from public,anon;
grant execute on function public.save_control_record(uuid,uuid,text,jsonb,integer) to authenticated;

-- Source archives are encrypted at build time. Only an owner may obtain their key.
create table app_private.control_source_keys(key_id text primary key,key_hex text not null check(key_hex~'^[0-9a-f]{64}$'),created_at timestamptz not null default clock_timestamp());
alter table app_private.control_source_keys enable row level security;
revoke all on app_private.control_source_keys from public,anon,authenticated;
create or replace function public.control_source_key(p_tenant uuid,p_key_id text)
returns text language plpgsql security definer set search_path='' as $$
declare secret text;
begin
 if not app_private.is_control_owner(p_tenant) then raise exception 'Somente o proprietário pode baixar o código completo'; end if;
 select key_hex into secret from app_private.control_source_keys where key_id=p_key_id;
 if secret is null then raise exception 'Pacote de código não reconhecido'; end if;
 insert into public.operation_audit(tenant_id,operator_id,action,record_id,details) values(p_tenant,auth.uid(),'source_download',p_tenant,jsonb_build_object('keyId',p_key_id));
 return secret;
end;$$;
revoke all on function public.control_source_key(uuid,text) from public,anon;
grant execute on function public.control_source_key(uuid,text) to authenticated;
