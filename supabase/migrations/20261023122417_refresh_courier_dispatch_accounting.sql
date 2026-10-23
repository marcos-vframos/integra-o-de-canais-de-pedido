-- A fresh dispatch belongs to its actual business day. Repeated confirmations and courier corrections retain the dispatch time.
create or replace function app_private.manage_store_operation(p_tenant uuid,p_action text,p_id uuid default null,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 operator uuid:=auth.uid(); role_name text; o public.orders%rowtype; c public.closures%rowtype;
 courier public.motoboys%rowtype; status_new text; ids uuid[]; cutoff timestamptz; closed_time timestamptz;
 gross numeric; discount_value numeric; expected numeric; n integer; stock_code text; restored_qty numeric;
 restored jsonb:='[]'::jsonb; stock_name text; old_status text; item jsonb; shopping jsonb;
begin
 select m.role into role_name from public.tenant_memberships m where m.tenant_id=p_tenant and m.user_id=operator and m.active;
 if operator is null or coalesce(role_name,'') not in ('owner','manager','cashier') then raise exception 'Operador sem permissão'; end if;
 if coalesce(p_action,'') not in ('order_status','cancel_order','close_register','assign_courier') then raise exception 'Operação não permitida'; end if;
 -- Same tenant lock as checkout; closes and cancellations cannot race a new sale.
 perform 1 from public.tenants where id=p_tenant for update;
 if p_action='close_register' then
   select max(closed_at) into cutoff from public.closures where tenant_id=p_tenant;
   select array_agg(id order by id),coalesce(sum(total),0),count(*) into ids,gross,n
     from public.orders where tenant_id=p_tenant and closure_id is null and status not in ('recusado','cancelado')
     and (cutoff is null or created_at>cutoff);
   if n=0 then raise exception 'Caixa sem pedidos para fechar'; end if;
   discount_value:=coalesce((p_payload->>'discount')::numeric,0);
   expected:=(p_payload->>'grossTotal')::numeric;
   if discount_value<0 or discount_value>gross then raise exception 'Desconto de fechamento inválido'; end if;
   if expected is null or expected<>gross or (p_payload->>'ordersCount')::integer is distinct from n then
     raise exception 'Caixa mudou durante a conferência. Atualize os pedidos e confira novamente';
   end if;
   closed_time:=clock_timestamp();
   select coalesce(jsonb_agg(jsonb_build_object('ingredientName',name,'consumedQty',0,'unit',unit,'currentStock',qty,'minStock',min_qty,'suggestedBuy',greatest(0,min_qty-qty)) order by qty,name),'[]'::jsonb)
    into shopping from public.inventory where tenant_id=p_tenant and (qty<min_qty or qty<=0);
   insert into public.closures(tenant_id,opened_at,closed_at,date_label,gross_total,discount,net_total,orders_count,by_payment,by_origin_count,by_origin_totals,product_breakdown,shopping_report)
    values(p_tenant,coalesce(cutoff,(select min(created_at) from public.orders where id=any(ids))),closed_time,to_char(closed_time at time zone 'America/Sao_Paulo','DD/MM/YYYY'),gross,discount_value,gross-discount_value,n,
    (select coalesce(jsonb_object_agg(payment,amount),'{}'::jsonb) from (select payment,sum(total) amount from public.orders where id=any(ids) group by payment) p),
    (select coalesce(jsonb_object_agg(origin,amount),'{}'::jsonb) from (select origin,count(*) amount from public.orders where id=any(ids) group by origin) p),
    (select coalesce(jsonb_object_agg(origin,amount),'{}'::jsonb) from (select origin,sum(total) amount from public.orders where id=any(ids) group by origin) p),
    (select coalesce(jsonb_agg(jsonb_build_object('name',name,'qty',qty,'total',amount) order by amount desc),'[]'::jsonb) from
       (select it->>'name' name,sum((it->>'qty')::numeric) qty,sum((it->>'qty')::numeric*(it->>'price')::numeric) amount from public.orders, jsonb_array_elements(items) it where id=any(ids) group by it->>'name') b),shopping)
    returning * into c;
   update public.orders set closure_id=c.id where tenant_id=p_tenant and id=any(ids);
   insert into public.operation_audit(tenant_id,operator_id,action,record_id,details) values(p_tenant,operator,'close_register',c.id,jsonb_build_object('ordersCount',n,'grossTotal',gross,'discount',discount_value));
   return to_jsonb(c);
 end if;
 select * into o from public.orders where tenant_id=p_tenant and id=p_id for update;
 if not found then raise exception 'Pedido não encontrado'; end if;
 old_status:=o.status;
 if p_action='assign_courier' then
   if o.delivery_type is distinct from 'entrega' then raise exception 'Pedido não é uma entrega'; end if;
   if o.status in ('recusado','cancelado') then raise exception 'Pedido cancelado não permite atribuir entregador'; end if;
   if not p_payload ? 'expectedMotoboyId' or (p_payload-'motoboyId'-'expectedMotoboyId')<>'{}'::jsonb then raise exception 'Informe o vínculo atual para alterar o motoboy'; end if;
   if coalesce(o.motoboy_id::text,'')<>coalesce(p_payload->>'expectedMotoboyId','') then raise exception 'O motoboy mudou em outro terminal. Atualize o pedido e tente novamente'; end if;
   if nullif(p_payload->>'motoboyId','') is not null then
     select * into courier from public.motoboys where tenant_id=p_tenant and id=(p_payload->>'motoboyId')::uuid and active;
     if not found then raise exception 'Motoboy não encontrado ou inativo'; end if;
   end if;
   if o.motoboy_id is not distinct from courier.id and o.motoboy_name is not distinct from courier.name then return to_jsonb(o); end if;
   insert into public.operation_audit(tenant_id,operator_id,action,record_id,details)
    values(p_tenant,operator,'assign_courier',o.id,jsonb_build_object('previousMotoboyId',o.motoboy_id,'previousMotoboyName',o.motoboy_name,'motoboyId',courier.id,'motoboyName',courier.name));
   update public.orders set motoboy_id=courier.id,motoboy_name=courier.name,
    motoboy_assigned_at=case when courier.id is not null then coalesce(motoboy_assigned_at,clock_timestamp()) else motoboy_assigned_at end
    where id=o.id returning * into o;
   return to_jsonb(o);
 end if;
 if p_action='cancel_order' then
   if o.status in ('recusado','cancelado') then return jsonb_build_object('success',true,'orderId',o.id,'deletedId',o.id,'status',o.status,'restoredItems',restored,'replayed',true); end if;
   select max(closed_at) into cutoff from public.closures where tenant_id=p_tenant;
   if o.closure_id is not null or (cutoff is not null and o.created_at<=cutoff) then raise exception 'Comanda já pertence a um fechamento. Registre o ajuste financeiro antes de cancelar'; end if;
   if exists(select 1 from jsonb_array_elements(o.items) it where not it ? 'stockDeductions') then raise exception 'Pedido antigo sem registro de consumo. Confira o estoque manualmente antes do cancelamento'; end if;
   for stock_code,restored_qty in select d.key,sum(d.value::numeric) from jsonb_array_elements(o.items) it cross join lateral jsonb_each_text(it->'stockDeductions') d group by d.key order by d.key loop
     if restored_qty<=0 then raise exception 'Consumo de estoque inválido'; end if;
     update public.inventory set qty=qty+restored_qty where tenant_id=p_tenant and inventory.code=stock_code returning name into stock_name;
     if not found then raise exception 'Ingrediente do pedido não encontrado no estoque'; end if;
     restored:=restored||jsonb_build_array(jsonb_build_object('name',stock_name,'restoredQty',restored_qty));
   end loop;
   update public.orders set status='recusado',payment_details=payment_details||jsonb_build_object('cancelledAt',clock_timestamp(),'cancelledBy',operator) where id=o.id;
   if o.customer_id is not null then
    update public.customers set total_orders=greatest(0,total_orders-1),total_spent=greatest(0,total_spent-o.total) where tenant_id=p_tenant and id=o.customer_id;
   end if;
   insert into public.operation_audit(tenant_id,operator_id,action,record_id,details) values(p_tenant,operator,'cancel_order',o.id,jsonb_build_object('previousStatus',old_status,'restoredItems',restored,'reason',left(coalesce(p_payload->>'reason',''),200)));
   return jsonb_build_object('success',true,'orderId',o.id,'deletedId',o.id,'status','recusado','restoredItems',restored);
 end if;
 status_new:=p_payload->>'status';
 if coalesce(status_new,'') not in ('aceito','pronto','concluído') then raise exception 'Status de pedido inválido'; end if;
 if o.status in ('recusado','cancelado') then raise exception 'Pedido cancelado não pode ser reaberto sem nova venda'; end if;
 if (p_payload-'status'-'motoboyId'-'motoboyName')<>'{}'::jsonb then raise exception 'Alteração de valores do pedido não permitida'; end if;
 if nullif(p_payload->>'motoboyId','') is not null then
   select * into courier from public.motoboys where tenant_id=p_tenant and id=(p_payload->>'motoboyId')::uuid and active;
   if not found then raise exception 'Motoboy não encontrado ou inativo'; end if;
 end if;
 if status_new='pronto' and o.delivery_type='entrega' and coalesce(courier.id,o.motoboy_id) is null then raise exception 'Selecione um motoboy ativo antes de despachar a entrega'; end if;
 update public.orders set status=status_new,motoboy_id=coalesce(courier.id,motoboy_id),motoboy_name=coalesce(courier.name,motoboy_name),motoboy_assigned_at=case when status_new='pronto' and o.delivery_type='entrega' and old_status is distinct from 'pronto' then clock_timestamp() when courier.id is not null then coalesce(motoboy_assigned_at,clock_timestamp()) else motoboy_assigned_at end where id=o.id returning * into o;
 insert into public.operation_audit(tenant_id,operator_id,action,record_id,details) values(p_tenant,operator,'order_status',o.id,jsonb_build_object('from',old_status,'to',status_new,'motoboyId',courier.id));
 return to_jsonb(o);
end $$;
