-- Synthetic data only. Everything, including orders and inventory movements, is rolled back.
begin;
do $$
declare
  t uuid; ingredient uuid; a uuid; b uuid; other uuid; promo uuid;
  result jsonb; payload jsonb; rejected boolean; remaining numeric;
  s jsonb := '{"mode":"weekly","weekdays":[2,3],"allDay":true}';
begin
  assert public.campaign_schedule_matches(s,'2026-10-20T03:00:00Z'), 'Tuesday starts at Brasília midnight';
  assert not public.campaign_schedule_matches(s,'2026-10-20T02:59:59Z'), 'Monday in Brasília';
  assert public.campaign_schedule_matches(s,'2026-10-22T02:59:59Z'), 'Wednesday ends at Brasília midnight';
  assert not public.campaign_schedule_matches(s,'2026-10-22T03:00:00Z'), 'Thursday is excluded';
  assert public.campaign_schedule_matches(s,'2026-10-27T03:00:00Z'), 'Reactivates next week';
  s := '{"mode":"weekly","weekdays":[2],"allDay":false,"startTime":"18:00","endTime":"02:00"}';
  assert public.campaign_schedule_matches(s,'2026-10-21T04:59:59Z'), 'Overnight uses starting weekday';
  assert not public.campaign_schedule_matches(s,'2026-10-21T05:00:00Z'), 'End time excluded';
  assert not public.campaign_schedule_matches(s,'2026-10-21T21:00:00Z'), 'Other weekday excluded';
  assert not public.campaign_schedule_valid('{"mode":"dates","allDay":true,"dates":["2026-02-30"]}'), 'Reject nonexistent date';
  assert public.campaign_schedule_matches('{"mode":"dates","allDay":true,"dates":["2026-10-27"]}','2026-10-27T03:00:00Z'), 'Explicit date';

  insert into public.tenants(slug,display_name,status) values('test-promo-'||gen_random_uuid(),'Synthetic promotion test','TRIAL') returning id into t;
  insert into public.settings(tenant_id,key,value) values(t,'force_open','true');
  insert into public.inventory(tenant_id,code,name,unit,qty,inventory_group)
    values(t,'test-meat','Carne teste','un',20,'Ingrediente') returning id into ingredient;
  insert into public.menu(tenant_id,code,name,category,price,recipe) values
    (t,'test-a','Lanche teste A','Carnes',15,jsonb_build_array(jsonb_build_object('ingredientId','test-meat','qty',1))) returning id into a;
  insert into public.menu(tenant_id,code,name,category,price,recipe) values
    (t,'test-b','Lanche teste B','Carnes',26,jsonb_build_array(jsonb_build_object('ingredientId','test-meat','qty',1))) returning id into b;
  insert into public.menu(tenant_id,code,name,category,price) values(t,'test-other','Fora da oferta','Carnes',30) returning id into other;
  insert into public.seasonal_campaigns(tenant_id,title,active,schedule,offer) values
    (t,'Oferta teste',true,'{"mode":"always","allDay":true}',jsonb_build_object('productId',a,'productIds',jsonb_build_array(a,b),'included',jsonb_build_array(jsonb_build_object('ingredientId',ingredient,'qty',1)))) returning id into promo;
  payload := jsonb_build_object('origin','online','customerName','Teste sintético','customerPhone','00000000000','deliveryType','retirada','payment','Dinheiro',
    'clientRequestId','ord-'||gen_random_uuid(),
    'items',jsonb_build_array(jsonb_build_object('itemId',a,'qty',2,'promotionId',promo,'price',0),jsonb_build_object('itemId',b,'qty',1,'promotionId',promo,'price',0)));
  result := public.checkout_finalize_order(t,payload);
  assert (result#>>'{order,total}')::numeric=56, 'Canonical prices 2x15 + 26, no charge for gifts';
  assert (result#>>'{order,items,0,added,0,unitPrice}')::numeric=0, 'Gift recorded at zero';
  assert (result#>>'{order,items,0,added,0,qty}')::numeric=1, 'One gift per unit';
  assert result#>>'{order,items,0,added,0,name}' like '%grátis%', 'Comanda identifies gift';
  select qty into remaining from public.inventory where id=ingredient;
  assert remaining=14, 'Three purchased meats and three free meats deducted';
  result := public.checkout_finalize_order(t,payload);
  assert (result->>'replayed')::boolean, 'Idempotent retry';
  select qty into remaining from public.inventory where id=ingredient;
  assert remaining=14, 'Retry does not deduct twice';

  payload := payload - 'clientRequestId';
  payload := jsonb_set(payload,'{items}',jsonb_build_array(jsonb_build_object('itemId',other,'qty',1,'promotionId',promo)));
  rejected := false;
  begin perform public.checkout_finalize_order(t,payload);
  exception when others then
    if sqlerrm not like '%Produto não corresponde%' then raise; end if;
    rejected := true;
  end;
  assert rejected, 'Unrelated products rejected';
  payload := jsonb_set(payload,'{items}',jsonb_build_array(jsonb_build_object('itemId',a,'qty',1,'promotionId',promo)));
  update public.seasonal_campaigns set schedule='{"mode":"dates","dates":["2000-01-01"],"allDay":true}' where id=promo;
  rejected := false;
  begin perform public.checkout_finalize_order(t,payload);
  exception when others then
    if sqlerrm not like '%Oferta encerrada%' then raise; end if;
    rejected := true;
  end;
  assert rejected, 'Out-of-schedule checkout rejected even if offer already in cart';
  select qty into remaining from public.inventory where id=ingredient;
  assert remaining=14, 'Rejected checkouts do not change stock';
end $$;
rollback;
select 'promotion schedule, canonical prices, gifts, stock, retry and expiry checks passed; synthetic data rolled back' as result;
