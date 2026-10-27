-- Owner selected R$ 8 per portion on 2026-10-27. Tenant-scoped catalog data only.
-- Reapplying preserves later manager edits, including prices and active status.
begin;
insert into public.menu(tenant_id,code,name,category,price,recipe)
select '8c0d61b8-7cf9-44e0-9e17-96832f3848b6'::uuid, v.code,v.name,'Complementos',8,
 jsonb_build_array(jsonb_build_object('ingredientId',v.ingredient,'qty',1))
from (values ('x-bacon','Bacon (adicional)','ing-bacon'),
 ('x-calabresa','Calabresa (adicional)','ing-calabresa')) as v(code,name,ingredient)
where exists(select 1 from public.inventory i where i.tenant_id='8c0d61b8-7cf9-44e0-9e17-96832f3848b6'::uuid and i.code=v.ingredient)
and not exists(select 1 from public.menu m where m.tenant_id='8c0d61b8-7cf9-44e0-9e17-96832f3848b6'::uuid and m.code=v.code);
commit;
