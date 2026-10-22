"""Print a tenant-scoped SQL import; preserves existing prices, notes and polygons.
Usage: python scripts/seed-pinda-neighborhoods.py TENANT_UUID > /tmp/pinda-import.sql
Review the generated SQL before executing it against the intended tenant.
"""
from pathlib import Path
import json,sys,uuid
if len(sys.argv)!=2:
    raise SystemExit('Informe o UUID da empresa de destino.')
tenant=str(uuid.UUID(sys.argv[1]))
records=json.loads((Path(__file__).resolve().parents[1]/'src/data/pinda-neighborhoods.json').read_text())
assert len(records)==130
payload=json.dumps(records,ensure_ascii=False,separators=(',',':'))
assert '$catalog$' not in payload
print('begin;')
print('do $import$')
print(f"declare target uuid := '{tenant}'; n jsonb; old public.delivery_fees%rowtype; meta jsonb; incoming jsonb;")
print('begin')
print(" if not exists(select 1 from public.tenants where id=target) then raise exception 'Empresa de destino não encontrada'; end if;")
print(' for n in select value from jsonb_array_elements($catalog$'+payload+'$catalog$::jsonb) loop')
print("  select * into old from public.delivery_fees where tenant_id=target and (app_private.delivery_metadata(description)->>'pdfReferenceId'=n->>'referenceId' or lower(btrim(name))=lower(btrim(n->>'name'))) order by (app_private.delivery_metadata(description)->>'pdfReferenceId'=n->>'referenceId') desc nulls last,id limit 1 for update;")
print("  incoming := jsonb_build_object('pdfReferenceId',(n->>'referenceId')::integer,'coordinateSource','PDF fornecido pelo proprietário, 22/10/2026','zoneType',n->>'zoneType','classificationStatus',n->>'classificationStatus','sources',n->'sources','neighborhood',true,'fixedFee',true);")
print('  if found then')
print("   meta := app_private.delivery_metadata(old.description);")
print("   if meta='{}' and nullif(old.description,'') is not null then meta:=jsonb_build_object('note',old.description); end if;")
print("   update public.delivery_fees set name=n->>'name',lat=(n->>'lat')::numeric,lng=(n->>'lng')::numeric,description=(incoming||meta||jsonb_build_object('pdfReferenceId',(n->>'referenceId')::integer))::text,updated_at=now() where id=old.id;")
print('  else')
print("   insert into public.delivery_fees(tenant_id,name,fee,lat,lng,description,active) values(target,n->>'name',null,(n->>'lat')::numeric,(n->>'lng')::numeric,incoming::text,true);")
print('  end if;')
print(' end loop;')
print(" -- Add zone colors to legacy region entries without overwriting manual classifications.")
print(" update public.delivery_fees set description=(app_private.delivery_metadata(description)||case when app_private.delivery_metadata(description)='{}' and nullif(description,'') is not null then jsonb_build_object('note',description) else '{}'::jsonb end||jsonb_build_object('zoneType',case when lower(name) like '%centro%' then 'central' when lower(name) like '%moreira%' then 'district' else 'urban' end,'classificationStatus','provisional'))::text where tenant_id=target and not app_private.delivery_metadata(description)?'zoneType';")
print('end $import$;')
print('commit;')
print(f"select count(*) as total, count(*) filter(where fee is null) as pending, count(*) filter(where app_private.delivery_metadata(description)?'pdfReferenceId') as pdf_references from public.delivery_fees where tenant_id='{tenant}';")
