begin;
do $$
declare t uuid; product uuid; meat uuid; egg uuid; result jsonb; payload jsonb; rejected boolean;
begin
 insert into public.tenants(slug,display_name,status) values('notes-test-'||gen_random_uuid(),'Synthetic notes test','TRIAL') returning id into t;
 insert into public.settings(tenant_id,key,value) values(t,'force_open','true');
 insert into public.inventory(tenant_id,code,name,unit,qty,inventory_group) values(t,'ing-hamburguer','Carne teste','un',40,'Ingrediente') returning id into meat;
 insert into public.inventory(tenant_id,code,name,unit,qty,inventory_group) values(t,'ing-ovo','Ovo teste','un',30,'Ingrediente') returning id into egg;
 insert into public.menu(tenant_id,code,name,category,price,recipe) values(t,'c-max','Max teste','Carnes',21,'[{"ingredientId":"ing-hamburguer","qty":3}]') returning id into product;
 insert into public.menu(tenant_id,code,name,category,price,recipe) values(t,'x-carne','Carne adicional','Complementos',3,'[{"ingredientId":"ing-hamburguer","qty":1}]');
 insert into public.menu(tenant_id,code,name,category,price,recipe) values(t,'x-ovo','Ovo adicional','Complementos',3,'[{"ingredientId":"ing-ovo","qty":1}]');
 payload:=jsonb_build_object('origin','online','customerName','Teste sintético','customerPhone','00000000000','deliveryType','retirada','payment','Dinheiro','clientRequestId','ord-'||gen_random_uuid(),
 'items',jsonb_build_array(jsonb_build_object('itemId',product,'qty',2,'notes',E'  Cortar ao meio\nBem passado <sem script>  ','added','[{"name":"ing-ovo","qty":2},{"name":"ing-hamburguer","qty":1}]'::jsonb)));
 result:=public.checkout_finalize_order(t,payload);
 assert result#>>'{order,items,0,notes}'=E'Cortar ao meio\nBem passado <sem script>','Per-product notes persist as plain text';
 assert (result#>>'{order,total}')::numeric=60,'Registered extras outside recipe charge exact prices per unit';
 assert (select qty from public.inventory where id=meat)=32,'Three standard patties plus one extra per sandwich';
 assert (select qty from public.inventory where id=egg)=26,'Two eggs per unit deducted';
 result:=public.checkout_finalize_order(t,payload);
 assert (result->>'replayed')::boolean and (select qty from public.inventory where id=meat)=32,'Replay preserves notes without duplicate stock deduction';
 payload:=jsonb_set(payload,'{clientRequestId}',to_jsonb('ord-'||gen_random_uuid()::text));
 payload:=jsonb_set(payload,'{items,0,notes}',to_jsonb(repeat('a',501)));
 rejected:=false;begin perform public.checkout_finalize_order(t,payload);exception when others then if sqlerrm not like '%Observações%' then raise;end if;rejected:=true;end;
 assert rejected and (select qty from public.inventory where id=meat)=32,'Oversized note rejected atomically';
 payload:=jsonb_set(payload,'{items,0,notes}','{}'::jsonb);
 rejected:=false;begin perform public.checkout_finalize_order(t,payload);exception when others then if sqlerrm not like '%Observações%' then raise;end if;rejected:=true;end;
 assert rejected,'Non-text note rejected';
end $$;
rollback;
select 'notes, Max meat quantities, registered extras, prices, stock and replay passed; fixtures rolled back' as result;
