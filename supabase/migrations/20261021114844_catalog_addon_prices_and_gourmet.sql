do $patch$
declare source text; updated text; start_pos integer; end_pos integer;
begin
  source:=pg_get_functiondef('public.checkout_finalize_order(uuid,jsonb,uuid)'::regprocedure);
  start_pos:=strpos(source,'      v_rec:=3;');
  end_pos:=strpos(source,'      v_unit:=v_unit+(v_rec*v_add_qty);');
  if start_pos=0 or end_pos<=start_pos then raise exception 'Checkout changed: inspect pricing before update'; end if;
  updated:=substring(source from 1 for start_pos-1) || $pricing$
      if v_stock.code ~ '^ing-(refri|agua|suco)' then
        raise exception 'Bebidas devem ser adicionadas como produtos, pelo valor integral';
      end if;
      select m.price into v_rec from public.menu m
      where m.tenant_id=p_tenant and m.active and m.category='Complementos'
        and exists (
          select 1 from jsonb_array_elements(m.recipe) r
          where r->>'ingredientId' in (v_stock.code,v_stock.id::text,v_stock.legacy_id)
        )
      order by m.code limit 1;
      if v_rec is null or v_rec<=0 then
        raise exception 'Adicional sem preço cadastrado: %', v_stock.name;
      end if;
$pricing$ || substring(source from end_pos);
  execute updated;
end $patch$;
update public.menu set category='Gourmet',updated_at=now() where code='e-especialgourmet' and category='Especial';
