begin;
do $$
declare t uuid; product uuid; payload jsonb; result jsonb;
begin
 insert into public.tenants(slug,display_name,status) values('bacon-calabresa-test-'||gen_random_uuid(),'Synthetic add-on test','TRIAL') returning id into t;
 insert into public.settings(tenant_id,key,value) values(t,'force_open','true');
 insert into public.inventory(tenant_id,code,name,unit,qty,inventory_group) values
 (t,'ing-bacon','Bacon','porção',50,'Ingrediente'),(t,'ing-calabresa','Calabresa','porção',50,'Ingrediente');
 insert into public.menu(tenant_id,code,name,category,price,recipe) values
 (t,'x-bacon','Bacon (adicional)','Complementos',8,'[{"ingredientId":"ing-bacon","qty":1}]'),
 (t,'x-calabresa','Calabresa (adicional)','Complementos',8,'[{"ingredientId":"ing-calabresa","qty":1}]');
 insert into public.menu(tenant_id,code,name,category,price,recipe) values(t,'test-sandwich','Lanche teste','Carnes',30,
 '[{"ingredientId":"ing-bacon","qty":1},{"ingredientId":"ing-calabresa","qty":1}]') returning id into product;
 payload:=jsonb_build_object('origin','online','customerName','Teste sintético','customerPhone','00000000000','deliveryType','retirada','payment','Dinheiro','clientRequestId','ord-'||gen_random_uuid(),
 'items',jsonb_build_array(jsonb_build_object('itemId',product,'qty',2,'added','[{"name":"ing-bacon","qty":1,"unitPrice":0},{"name":"ing-calabresa","qty":2,"unitPrice":0}]'::jsonb)));
 result:=public.checkout_finalize_order(t,payload);
 assert (result#>>'{order,total}')::numeric=108,'Server charges R$8 per extra portion on each sandwich';
 assert (result#>>'{order,items,0,added,0,unitPrice}')::numeric=8,'Receipt contains canonical price';
 assert (select qty from public.inventory where tenant_id=t and code='ing-bacon')=46,'Bacon recipe plus extras deducted';
 assert (select qty from public.inventory where tenant_id=t and code='ing-calabresa')=44,'Calabresa recipe plus extras deducted';
 result:=public.checkout_finalize_order(t,payload);
 assert (result->>'replayed')::boolean and (select qty from public.inventory where tenant_id=t and code='ing-bacon')=46,'Replay does not duplicate deductions';
end $$;
rollback;
select 'bacon/calabresa pricing, receipt, stock and replay passed; synthetic fixtures rolled back' as result;
