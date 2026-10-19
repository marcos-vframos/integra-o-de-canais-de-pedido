-- Server-side campaign validation; buyer never chooses free items or their prices.
create or replace function public.checkout_finalize_order(
  p_tenant uuid, p_payload jsonb, p_operator uuid default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_tenant public.tenants%rowtype;
  v_origin text := coalesce(p_payload->>'origin','online');
  v_request text := nullif(left(trim(coalesce(p_payload->>'clientRequestId','')),80),'');
  v_existing public.orders%rowtype;
  v_raw jsonb; v_ing jsonb; v_add jsonb;
  v_item public.menu%rowtype; v_stock public.inventory%rowtype;
  v_qty integer; v_units integer:=0; v_add_qty integer;
  v_unit numeric(14,2); v_subtotal numeric(14,2):=0;
  v_discount numeric(14,2):=0; v_fee numeric(14,2):=0; v_total numeric(14,2);
  v_bread text; v_bread_qty numeric; v_has_bread boolean; v_gourmet text;
  v_deductions jsonb:='{}'::jsonb; v_items jsonb:='[]'::jsonb; v_added jsonb;
  v_key text; v_use numeric; v_removed jsonb; v_name text;
  v_region text:=''; v_delivery text := coalesce(p_payload->>'deliveryType','retirada');
  v_lat numeric; v_lng numeric; v_distance numeric; v_nearest public.delivery_fees%rowtype;
  v_campaign public.campaigns%rowtype;
  v_campaign_offer public.seasonal_campaigns%rowtype;
  v_offer jsonb; v_bonus jsonb; v_bonus_qty integer; v_promo_id text;
  v_phone text := trim(coalesce(p_payload->>'customerPhone',''));
  v_digits text := regexp_replace(coalesce(p_payload->>'customerPhone',''),'\D','','g');
  v_counter public.settings%rowtype; v_ticket bigint;
  v_order public.orders%rowtype; v_customer public.customers%rowtype;
  v_payment text; v_kind text; v_pct numeric; v_target_total numeric;
  v_favs jsonb; v_rec numeric;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Formato de pedido inválido';
  end if;
  if v_origin not in ('online','balcao') then raise exception 'Origem de pedido inválida'; end if;
  if v_request is not null and v_request !~ '^ord-[a-zA-Z0-9-]{18,76}$' then
    raise exception 'Identificador de pedido inválido';
  end if;
  if v_request is not null then
    select * into v_existing from public.orders where tenant_id=p_tenant and idempotency_key=v_request limit 1;
    if found then
      return jsonb_build_object('success',true,'order',jsonb_build_object(
        'id',v_existing.id,'ticketNumber',v_existing.ticket_number,'items',v_existing.items,
        'subtotal',v_existing.subtotal,'discount',v_existing.discount,
        'deliveryFee',v_existing.delivery_fee,'total',v_existing.total,
        'payment',v_existing.payment,'status',v_existing.status,'origin',v_existing.origin,
        'created',v_existing.created_at),'replayed',true,'lowStockWarnings','[]'::jsonb);
    end if;
  end if;
  select * into v_tenant from public.tenants where id=p_tenant for share;
  if not found or v_tenant.status not in ('ACTIVE','TRIAL') then
    raise exception 'Loja ainda não liberada para novos pedidos';
  end if;
  if v_origin='balcao' then
    if p_operator is null or not exists(
      select 1 from public.tenant_memberships
      where tenant_id=p_tenant and user_id=p_operator and active
        and role in('owner','manager','cashier')
    ) then raise exception 'Acesso ao caixa não autorizado'; end if;
  else
    if length(trim(coalesce(p_payload->>'customerName','')))<2 or length(v_digits)<10 or length(v_digits)>15
    then raise exception 'Informe nome e telefone válidos'; end if;
    if v_delivery not in ('entrega','retirada') then raise exception 'Tipo de entrega inválido'; end if;
    if v_delivery='entrega' and length(trim(coalesce(p_payload->>'customerAddress','')))<5
    then raise exception 'Endereço de entrega obrigatório'; end if;
    if coalesce((select value from public.settings where tenant_id=p_tenant and key='force_closed'), 'false')='true'
      or (
        coalesce((select value from public.settings where tenant_id=p_tenant and key='force_open'),'false')<>'true'
        and coalesce((select value from public.settings where tenant_id=p_tenant and key='is_open'),'false')<>'true'
      )
    then raise exception 'Loja fechada para pedidos'; end if;
  end if;
  if jsonb_typeof(p_payload->'items')<>'array'
    or jsonb_array_length(p_payload->'items')<1
    or jsonb_array_length(p_payload->'items')>40 then
    raise exception 'Carrinho inválido (máximo 40 linhas)';
  end if;

  for v_raw in select value from jsonb_array_elements(p_payload->'items')
  loop
    v_qty := nullif(v_raw->>'qty','')::integer;
    if v_qty is null or v_qty<1 or v_qty>30 then raise exception 'Quantidade inválida'; end if;
    v_units:=v_units+v_qty;
    if v_units>100 then raise exception 'Pedido excede 100 unidades'; end if;

    select * into v_item from public.menu m
    where m.tenant_id=p_tenant and m.active
      and (m.id::text=v_raw->>'itemId' or m.code=v_raw->>'itemId' or m.legacy_id=v_raw->>'itemId')
    order by m.id limit 1;
    if not found then raise exception 'Produto indisponível: %',left(coalesce(v_raw->>'itemId',''),40); end if;
    v_unit := v_item.price;
    v_promo_id:=nullif(v_raw->>'promotionId','');
    v_offer:='{}'::jsonb;
    if v_promo_id is not null then
      if v_origin <> 'online' then raise exception 'Oferta vinculada disponível apenas na loja online'; end if;
      select * into v_campaign_offer from public.seasonal_campaigns sc
      where sc.tenant_id=p_tenant and sc.active
        and (sc.id::text=v_promo_id or sc.legacy_id=v_promo_id)
        and (sc.start_date is null or sc.start_date<=now())
        and (sc.end_date is null or sc.end_date>=now())
      limit 1;
      if not found then raise exception 'Oferta encerrada ou indisponível'; end if;
      v_offer:=coalesce(v_campaign_offer.offer,'{}'::jsonb);
      if coalesce(v_offer->>'productId','') <> v_item.id::text then
        raise exception 'Produto não corresponde à oferta anunciada';
      end if;
      if v_offer ? 'unitPrice' then
        v_unit:=(v_offer->>'unitPrice')::numeric;
        if v_unit<0 or v_unit>v_item.price then raise exception 'Preço promocional inválido'; end if;
        v_unit:=round(v_unit,2);
      end if;
    end if;
    v_removed:=coalesce(v_raw->'removed','[]'::jsonb);
    if jsonb_typeof(v_removed)<>'array' or jsonb_array_length(v_removed)>30 then
      raise exception 'Remoções inválidas';
    end if;
    v_added:='[]'::jsonb;
    v_bread := case when v_raw->>'breadChoice'='frances' then 'frances' else 'hamburguer' end;
    v_has_bread:=false; v_bread_qty:=0;
    v_gourmet := case
      when v_item.category='Gourmet' and v_raw->>'gourmetFreeChoice' in('catupiry','cheddar')
      then v_raw->>'gourmetFreeChoice' else 'none' end;
    if jsonb_typeof(v_item.recipe)<>'array' then raise exception 'Receita do produto inválida'; end if;
    for v_ing in select value from jsonb_array_elements(v_item.recipe)
    loop
      select * into v_stock from public.inventory s
      where s.tenant_id=p_tenant
        and (s.code=v_ing->>'ingredientId' or s.legacy_id=v_ing->>'ingredientId' or s.id::text=v_ing->>'ingredientId')
      limit 1;
      if not found then raise exception 'Ingrediente não cadastrado em estoque'; end if;
      v_rec := coalesce(nullif(v_ing->>'qty','')::numeric,0);
      if v_rec < 0 or v_rec > 1000 then raise exception 'Quantidade inválida na receita'; end if;
      if v_stock.code in('ing-pao','ing-pao-frances') then
        v_has_bread:=true; v_bread_qty:=v_bread_qty+v_rec;
      elsif not exists(
        select 1 from jsonb_array_elements_text(v_removed) rem
        where lower(btrim(rem)) in(lower(coalesce(v_stock.code,'')),lower(v_stock.name))
      ) then
        v_key:=v_stock.code;
        v_deductions:=jsonb_set(v_deductions,array[v_key],
          to_jsonb(coalesce((v_deductions->>v_key)::numeric,0)+(v_rec*v_qty)),true);
      end if;
    end loop;
    if v_has_bread then
      v_key:=case when v_bread='frances' then 'ing-pao-frances' else 'ing-pao' end;
      if not exists(select 1 from public.inventory where tenant_id=p_tenant and code=v_key)
      then raise exception 'Pão indisponível no estoque'; end if;
      v_deductions:=jsonb_set(v_deductions,array[v_key],
        to_jsonb(coalesce((v_deductions->>v_key)::numeric,0)+(v_bread_qty*v_qty)),true);
      if v_bread='frances' then v_unit:=v_unit+2; end if;
    elsif v_raw->>'breadChoice'='frances' then
      raise exception 'Troca de pão não permitida nesta receita';
    end if;
    if v_raw ? 'added' and jsonb_typeof(v_raw->'added') <> 'array' then raise exception 'Adicionais inválidos'; end if;
    if coalesce(jsonb_array_length(coalesce(v_raw->'added','[]'::jsonb)),0)>40 then raise exception 'Adicionais em excesso'; end if;
    for v_add in select value from jsonb_array_elements(coalesce(v_raw->'added','[]'::jsonb))
    loop
      v_add_qty:=nullif(v_add->>'qty','')::integer;
      if v_add_qty is null or v_add_qty<0 or v_add_qty>10 then raise exception 'Quantidade adicional inválida'; end if;
      if v_add_qty=0 then continue; end if;
      v_name:=coalesce(v_add->>'name','');
      if position('(cortesia Gourmet' in v_name)>0 then
        if v_gourmet='none' then raise exception 'Cortesia não permitida'; end if;
        continue;
      end if;
      select * into v_stock from public.inventory s
      where s.tenant_id=p_tenant and s.inventory_group='Ingrediente'
        and (lower(s.name)=lower(v_name) or s.code=v_name or s.legacy_id=v_name or s.id::text=v_name)
      limit 1;
      if not found or v_stock.code in('ing-pao','ing-pao-frances') then raise exception 'Adicional indisponível'; end if;
      v_key:=v_stock.code;
      v_deductions:=jsonb_set(v_deductions,array[v_key],
        to_jsonb(coalesce((v_deductions->>v_key)::numeric,0)+(v_add_qty*v_qty)),true);
      v_rec:=3;
      if v_key in('ing-catupiry','ing-cheddar') then
        select price into v_rec from public.menu m
        where m.tenant_id=p_tenant and m.code=case when v_key='ing-catupiry' then 'x-catupiry' else 'x-cheddar' end
        limit 1;
        v_rec:=coalesce(v_rec,case when v_key='ing-catupiry' then 4 else 3 end);
      end if;
      v_unit:=v_unit+(v_rec*v_add_qty);
      v_added:=v_added || jsonb_build_array(jsonb_build_object('name',v_stock.name,'qty',v_add_qty,'unitPrice',v_rec));
    end loop;
    if v_promo_id is not null then
      v_bonus:=coalesce(v_offer->'included','[]'::jsonb);
      if jsonb_typeof(v_bonus)<>'array' or jsonb_array_length(v_bonus)>10 then
        raise exception 'Itens gratuitos da promoção inválidos';
      end if;
      for v_add in select value from jsonb_array_elements(v_bonus)
      loop
        v_bonus_qty:=nullif(v_add->>'qty','')::integer;
        if v_bonus_qty is null or v_bonus_qty<1 or v_bonus_qty>10 then
          raise exception 'Quantidade gratuita da promoção inválida';
        end if;
        select * into v_stock from public.inventory s
        where s.tenant_id=p_tenant and s.inventory_group='Ingrediente'
          and s.id::text=v_add->>'ingredientId' limit 1;
        if not found or v_stock.code in('ing-pao','ing-pao-frances') then
          raise exception 'Ingrediente gratuito inválido na promoção';
        end if;
        v_key:=v_stock.code;
        v_deductions:=jsonb_set(v_deductions,array[v_key],
          to_jsonb(coalesce((v_deductions->>v_key)::numeric,0)+(v_bonus_qty*v_qty)),true);
        v_added:=v_added || jsonb_build_array(jsonb_build_object(
          'name',v_stock.name||' (incluído na oferta — grátis)',
          'qty',v_bonus_qty,'unitPrice',0,'promotionId',v_campaign_offer.id
        ));
      end loop;
    end if;
    if v_gourmet <> 'none' then
      v_key:=case when v_gourmet='catupiry' then 'ing-catupiry' else 'ing-cheddar' end;
      select * into v_stock from public.inventory where tenant_id=p_tenant and code=v_key limit 1;
      if not found then raise exception 'Cortesia Gourmet sem estoque'; end if;
      v_deductions:=jsonb_set(v_deductions,array[v_key],
        to_jsonb(coalesce((v_deductions->>v_key)::numeric,0)+v_qty),true);
      v_added:=jsonb_build_array(jsonb_build_object('name',v_stock.name||' (cortesia Gourmet grátis)','qty',1,'unitPrice',0))||v_added;
    end if;
    v_subtotal:=v_subtotal+v_unit*v_qty;
    v_items:=v_items || jsonb_build_array(jsonb_build_object(
      'itemId',v_item.id,'name',v_item.name,'price',v_unit,'qty',v_qty,
      'removed',v_removed,'added',v_added,'breadChoice',case when v_has_bread then v_bread else null end,
      'breadSurcharge',case when v_has_bread and v_bread='frances' then 2 else 0 end,
      'gourmetFreeChoice',v_gourmet,
      'promotionId',v_promo_id,
      'promotionTitle',case when v_promo_id is not null then v_campaign_offer.title else null end
    ));
  end loop;

  if v_origin='online' and v_delivery='entrega' then
    -- Never trust fee sent by the browser. Select registered region; coordinate-based price
    -- uses the nearest region + R$1.50/km after 3km, rounded to 50 cents.
    if nullif(p_payload->>'deliveryLat','') is not null
      and nullif(p_payload->>'deliveryLng','') is not null then
      v_lat:=(p_payload->>'deliveryLat')::numeric; v_lng:=(p_payload->>'deliveryLng')::numeric;
      if v_lat not between -90 and 90 or v_lng not between -180 and 180 then
        raise exception 'Coordenadas de entrega inválidas'; end if;
    end if;
    if v_lat is not null and v_lng is not null then
      select f.* into v_nearest
      from public.delivery_fees f
      where f.tenant_id=p_tenant and f.active and f.lat is not null and f.lng is not null
      order by 6371*2*asin(least(1,sqrt(
        power(sin(radians((f.lat-v_lat)::double precision)/2),2)
        +cos(radians(v_lat::double precision))*cos(radians(f.lat::double precision))
          *power(sin(radians((f.lng-v_lng)::double precision)/2),2)
      ))) asc limit 1;
      if v_nearest.id is not null then
        v_distance := 6371*2*asin(least(1,sqrt(
          power(sin(radians((v_nearest.lat-v_lat)::double precision)/2),2)
          +cos(radians(v_lat::double precision))*cos(radians(v_nearest.lat::double precision))
            *power(sin(radians((v_nearest.lng-v_lng)::double precision)/2),2)
        )));
      end if;
    else
      select * into v_nearest from public.delivery_fees
      where tenant_id=p_tenant and active and name=p_payload->>'deliveryFeeRegion'
      limit 1;
    end if;
    if v_nearest.id is null then raise exception 'Selecione região de entrega válida'; end if;
    v_fee:=v_nearest.fee;
    v_region:=v_nearest.name;
    if v_distance > 3 then v_fee:=round((v_fee+(v_distance-3)*1.5)*2)/2; end if;
  elsif v_origin='balcao' then
    v_fee:=round(greatest(0,least(coalesce((p_payload->>'deliveryFee')::numeric,0),1000)),2);
    v_discount:=round(greatest(0,least(coalesce((p_payload->>'discount')::numeric,0),v_subtotal)),2);
  end if;

  if v_origin='online' and nullif(p_payload->>'campaignId','') is not null then
    select * into v_campaign from public.campaigns
    where tenant_id=p_tenant and (id::text=p_payload->>'campaignId' or legacy_id=p_payload->>'campaignId')
      and active and not used and (expires_at is null or expires_at>now())
    for update;
    if not found then raise exception 'Cupom inválido, expirado ou utilizado'; end if;
    if v_campaign.customer_phone is not null and v_campaign.customer_phone <> ''
      and regexp_replace(v_campaign.customer_phone,'\D','','g')<>v_digits then
      raise exception 'Cupom vinculado a outro telefone'; end if;
    if v_campaign.type='free_delivery' then v_fee:=0;
    elsif v_campaign.type='voucher_10' then
      v_discount:=round(v_subtotal*least(100,greatest(0,coalesce(nullif(v_campaign.discount_percent,0),10)))/100,2);
    elsif v_campaign.type='product_discount' then
      select coalesce(sum((val->>'price')::numeric*(val->>'qty')::numeric),0)
        into v_target_total from jsonb_array_elements(v_items) val
        where v_campaign.target_product_id is null or val->>'itemId'=v_campaign.target_product_id::text;
      v_discount:=least(v_target_total,coalesce(v_campaign.discount_amount,0));
      if v_campaign.discount_percent>0 then
        v_discount:=round(v_target_total*least(100,v_campaign.discount_percent)/100,2); end if;
    else raise exception 'Tipo de cupom inválido'; end if;
    v_discount:=least(v_subtotal,greatest(0,v_discount));
  end if;
  v_total:=greatest(0,v_subtotal-v_discount+v_fee);
  v_payment:=case when coalesce(p_payload->>'payment','') ilike 'Cartão%' then 'Cartão'
    when p_payload->>'payment'='Pix' then 'Pix'
    when p_payload->>'payment'='Dinheiro' then 'Dinheiro' else '' end;
  if v_payment='' then raise exception 'Forma de pagamento inválida'; end if;

  -- Serialize all inventory decrements by stable code order. A rollback restores all stocks.
  for v_key,v_use in select key,value::numeric from jsonb_each_text(v_deductions) order by key loop
    update public.inventory set qty=qty-v_use,updated_at=now()
    where tenant_id=p_tenant and code=v_key and qty>=v_use;
    if not found then raise exception 'Estoque insuficiente para ingrediente %',v_key; end if;
  end loop;
  insert into public.settings(tenant_id,key,value) values(p_tenant,'ticket_counter','1')
  on conflict (tenant_id,key) do nothing;
  select * into v_counter from public.settings where tenant_id=p_tenant and key='ticket_counter' for update;
  select greatest(coalesce(nullif(v_counter.value,'')::bigint,1),
    coalesce(max(ticket_number),0)+1) into v_ticket from public.orders where tenant_id=p_tenant;
  update public.settings set value=(v_ticket+1)::text where id=v_counter.id;

  insert into public.orders(
    tenant_id,ticket_number,items,subtotal,discount,delivery_fee,delivery_fee_region,total,
    payment,payment_details,status,origin,customer_name,customer_phone,delivery_type,
    customer_address,delivery_lat,delivery_lng,campaign_id,idempotency_key,
    invoice_requested,invoice_document,invoice_status
  ) values (
    p_tenant,v_ticket,v_items,v_subtotal,v_discount,v_fee,v_region,v_total,
    v_payment,coalesce(p_payload->'paymentDetails','{}'::jsonb),
    case when v_origin='online' then 'pendente' else 'pedido aberto' end,v_origin,
    left(trim(coalesce(p_payload->>'customerName','')),120),left(v_phone,40),
    case when v_delivery='entrega' then 'entrega' else 'retirada' end,
    left(coalesce(p_payload->>'customerAddress',''),350),
    v_lat,v_lng,case when v_campaign.id is not null then v_campaign.id else null end,
    v_request,coalesce((p_payload->>'invoiceRequested')::boolean,false),
    left(regexp_replace(coalesce(p_payload->>'invoiceDocument',''),'\D','','g'),14),
    case when coalesce((p_payload->>'invoiceRequested')::boolean,false) then 'pendente_emissao' else 'nao_solicitada' end
  ) returning * into v_order;
  if v_campaign.id is not null then
    update public.campaigns set used=true,active=false where id=v_campaign.id;
  end if;

  if v_origin='online' then
    insert into public.customers(
      tenant_id,name,phone,address,total_orders,total_spent,last_order_at,favorite_items
    ) values (
      p_tenant,left(trim(p_payload->>'customerName'),120),v_phone,
      left(coalesce(p_payload->>'customerAddress',''),350),1,v_total,now(),
      (select coalesce(jsonb_agg(distinct it->>'name'),'[]'::jsonb) from jsonb_array_elements(v_items) it)
    ) on conflict (tenant_id,phone) do update set
      name=excluded.name,
      address=case when excluded.address<>'' then excluded.address else public.customers.address end,
      total_orders=public.customers.total_orders+1,
      total_spent=public.customers.total_spent+excluded.total_spent,
      last_order_at=excluded.last_order_at
    returning * into v_customer;
    update public.orders set customer_id=v_customer.id where id=v_order.id;
  end if;
  return jsonb_build_object(
    'success',true,
    'order',jsonb_build_object(
      'id',v_order.id,'ticketNumber',v_order.ticket_number,'items',v_order.items,
      'subtotal',v_order.subtotal,'discount',v_order.discount,'deliveryFee',v_order.delivery_fee,
      'deliveryFeeRegion',v_order.delivery_fee_region,'total',v_order.total,
      'payment',v_order.payment,'status',v_order.status,'origin',v_order.origin,
      'customerName',v_order.customer_name,'customerPhone',v_order.customer_phone,
      'customerAddress',v_order.customer_address,'invoiceRequested',v_order.invoice_requested,
      'invoiceStatus',v_order.invoice_status,'created',v_order.created_at
    ),
    'lowStockWarnings',(
      select coalesce(jsonb_agg(s.name),'[]'::jsonb) from public.inventory s
      where s.tenant_id=p_tenant and s.qty<=s.min_qty and v_deductions ? s.code
    )
  );
exception
  when unique_violation then
    if v_request is not null then
      select * into v_existing from public.orders where tenant_id=p_tenant and idempotency_key=v_request;
      if found then
        return jsonb_build_object('success',true,'replayed',true,'order',jsonb_build_object(
          'id',v_existing.id,'ticketNumber',v_existing.ticket_number,'items',v_existing.items,
          'subtotal',v_existing.subtotal,'discount',v_existing.discount,'deliveryFee',v_existing.delivery_fee,
          'total',v_existing.total,'payment',v_existing.payment,'status',v_existing.status,'created',v_existing.created_at
        ),'lowStockWarnings','[]'::jsonb);
      end if;
    end if;
    raise;
end $$;

revoke all on function public.checkout_finalize_order(uuid,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.checkout_finalize_order(uuid,jsonb,uuid) to service_role;
