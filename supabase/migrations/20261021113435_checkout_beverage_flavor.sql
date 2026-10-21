-- Preserve the validated flavor in the authoritative order and its printed name.
do $patch$
declare definition text; original text;
begin
  select pg_get_functiondef('public.checkout_finalize_order(uuid,jsonb,uuid)'::regprocedure) into original;
  definition := replace(original, '    v_unit := v_item.price;', $validation$
    if nullif(v_raw->>'beverageFlavor','') is not null then
      if not (coalesce(v_item.name,'') ~* 'refri|refrigerante' or coalesce(v_item.code,'') like 'b-refri%')
        or v_raw->>'beverageFlavor' not in ('Coca-Cola','Coca-Cola Zero','Sprite','Fanta Uva','Fanta Laranja','Guaraná Antarctica')
      then raise exception 'Sabor de refrigerante inválido'; end if;
    end if;
    if lower(btrim(coalesce(v_item.category,'')))='bebidas'
      and (coalesce(jsonb_array_length(v_raw->'added'),0)>0 or coalesce(jsonb_array_length(v_raw->'removed'),0)>0)
    then raise exception 'Bebidas não permitem adicionais ou remoções de ingredientes'; end if;
    v_unit := v_item.price;$validation$);
  definition := replace(definition,
    '''itemId'',v_item.id,''name'',v_item.name,''price'',v_unit,''qty'',v_qty,',
    $fields$'itemId',v_item.id,'name',v_item.name || case when nullif(v_raw->>'beverageFlavor','') is not null then ' — ' || (v_raw->>'beverageFlavor') else '' end,
      'beverageFlavor',nullif(v_raw->>'beverageFlavor',''),'price',v_unit,'qty',v_qty,$fields$);
  if definition=original or position('Sabor de refrigerante inválido' in definition)=0 or position('''beverageFlavor'',nullif' in definition)=0 then
    raise exception 'Checkout definition changed: inspect before applying';
  end if;
  execute definition;
end $patch$;
