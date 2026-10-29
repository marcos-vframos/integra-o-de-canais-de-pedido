-- Run inside a transaction and roll back; does not retain test orders.
begin;
do $$
declare t uuid:='8c0d61b8-7cf9-44e0-9e17-96832f3848b6'; product uuid; before_qty numeric; after_qty numeric; result jsonb; again jsonb; order_id uuid; test_order public.orders%rowtype;
begin
 select m.id into product from public.menu m where m.tenant_id=t and m.code='b-agua' and m.active limit 1;
 if product is null then select m.id into product from public.menu m where m.tenant_id=t and lower(m.name) like 'água%' and m.active limit 1; end if;
 if product is null then raise exception 'No water product available for integration test'; end if;
 select qty into before_qty from public.inventory where tenant_id=t and code='ing-agua-500';
 result:=public.checkout_finalize_order(t,jsonb_build_object('clientRequestId','ord-integration-rollback-20261029','origin','online','customerName','Verificacao integrada','customerPhone','12999990000','deliveryType','retirada','payment','Dinheiro','items',jsonb_build_array(jsonb_build_object('itemId',product,'qty',1,'removed','[]'::jsonb,'added','[]'::jsonb)),'paymentDetails',jsonb_build_object('integrationTest',false)),null);
 if result->>'success'<>'true' then raise exception 'Checkout failed'; end if;
 order_id:=(result->'order'->>'id')::uuid;
 select * into test_order from public.orders where id=order_id and tenant_id=t;
 if test_order.payment_details->>'integrationTest'<>'true' or test_order.customer_name not like '[TESTE] %' then raise exception 'Server test label missing'; end if;
 select qty into after_qty from public.inventory where tenant_id=t and code='ing-agua-500';
 if after_qty<>before_qty-1 then raise exception 'Stock was not reduced exactly once'; end if;
 again:=public.checkout_finalize_order(t,jsonb_build_object('clientRequestId','ord-integration-rollback-20261029','origin','online'),null);
 if again->>'replayed'<>'true' then raise exception 'Replay did not reuse existing order'; end if;
 if (select qty from public.inventory where tenant_id=t and code='ing-agua-500')<>after_qty then raise exception 'Replay duplicated stock deduction'; end if;
 raise notice 'PASS checkout, server label, stock deduction and idempotency';
end $$;
rollback;
