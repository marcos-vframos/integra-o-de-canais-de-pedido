begin;
do $$
declare t uuid; operator uuid:=gen_random_uuid(); inventory_id uuid; r jsonb; record_id uuid; loss_id uuid; loss_data jsonb; cost_id uuid; kind text; draft jsonb; denied boolean; n integer;
begin
 insert into auth.users(id,email) values(operator,'control-full-'||operator||'@example.invalid');
 insert into public.tenants(slug,display_name,status) values('control-full-'||gen_random_uuid(),'Synthetic control full test','TRIAL') returning id into t;
 insert into public.tenant_memberships(tenant_id,user_id,role,active) values(t,operator,'owner',true);
 insert into public.inventory(tenant_id,code,name,unit,qty,min_qty,inventory_group) values(t,'full-test-stock','Synthetic stock','un',10,2,'Ingrediente') returning id into inventory_id;
 perform set_config('request.jwt.claim.sub',operator::text,true);
 assert public.control_access(t),'Owner access permitted';
 foreach kind in array array['expense','payable','receivable','opening','reconciliation','lead','interaction','quality','goal','alert','cost','loss'] loop
  record_id:=gen_random_uuid();
  draft:=jsonb_build_object('name','Synthetic '||kind,'amount',10,'date',current_date::text,'status',case when kind='lead' then 'new' when kind in ('expense','opening','cost','loss') then 'settled' else 'open' end,'note','Synthetic verification','expected',10,'actual',9,'cash',100,'margin',20,'reply',5,'qty',2,'inventoryId',inventory_id,'phone','00000000000','owner','Synthetic operator','source','Synthetic test','key','synthetic');
  r:=public.save_control_record(t,record_id,kind,draft,0);
  assert r->>'id'=record_id::text and (r->>'revision')::integer=1,'Every area saves its initial record';
  if kind='loss' then loss_id:=record_id;loss_data:=draft;end if;
  if kind='cost' then cost_id:=record_id;end if;
 end loop;
 assert (select count(*) from public.control_records where tenant_id=t)=12,'All twelve record types persisted';
 assert (select qty from public.inventory where id=inventory_id)=8,'Loss reduced stock';
 r:=public.save_control_record(t,loss_id,'loss',loss_data||jsonb_build_object('status','void'),1);
 assert (select qty from public.inventory where id=inventory_id)=10,'Loss reversal restored stock';
 select data into draft from public.control_records where id=cost_id;
 r:=public.save_control_record(t,cost_id,'cost',draft||jsonb_build_object('amount',12),1);
 assert (r->>'revision')::integer=2,'Edit persisted and advanced revision';
 denied:=false;begin perform public.save_control_record(t,cost_id,'cost',draft,1);exception when others then if sqlerrm not like '%outra tela%' then raise;end if;denied:=true;end;
 assert denied,'Concurrent stale edit rejected';
 select count(*) into n from public.issue_voucher_batch(t,2,'product_discount',5,'Synthetic voucher','Synthetic batch',now()+interval '1 day',null);
 assert n=2 and (select count(distinct voucher_code) from public.campaigns where tenant_id=t)=2,'Voucher batch has exact quantity and unique codes';
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 assert not public.control_access(t),'Other identity cannot enter owner panel';
 denied:=false;begin perform public.save_control_record(t,cost_id,'cost',draft,2);exception when others then if sqlerrm not like '%proprietário%' then raise;end if;denied:=true;end;
 assert denied,'Other identity cannot save owner records';
end $$;
rollback;
select 'PASS: 12 control areas, persistence, optimistic conflicts, stock losses/reversal, voucher batch and access boundaries; all fixtures rolled back' as result;
