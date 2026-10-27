-- Preserve checkout validation, permissions, pricing and stock transactions; add bounded plain-text item notes.
do $migration$
declare definition text; marker text;
begin
 definition:=pg_get_functiondef('public.checkout_finalize_order(uuid,jsonb,uuid)'::regprocedure);
 marker:='    v_removed:=coalesce(v_raw->''removed'',''[]''::jsonb);';
 if position('Observações do produto inválidas' in definition)=0 then
  if position(marker in definition)=0 then raise exception 'Checkout validation marker not found'; end if;
  definition:=replace(definition,marker,$patch$    if v_raw ? 'notes' and v_raw->'notes'<>'null'::jsonb and (jsonb_typeof(v_raw->'notes')<>'string' or char_length(v_raw->>'notes')>500) then
      raise exception 'Observações do produto inválidas: máximo de 500 caracteres';
    end if;
$patch$||marker);
  marker:=$needle$'beverageFlavor',nullif(v_raw->>'beverageFlavor',''),'price',v_unit,'qty',v_qty,$needle$;
  if position(marker in definition)=0 then raise exception 'Checkout item marker not found'; end if;
  definition:=replace(definition,marker,$patch$'notes',nullif(btrim(v_raw->>'notes'),''),
      $patch$||marker);
  execute definition;
 end if;
end $migration$;

-- Only these eight Max sandwiches: three standard beef patties replace one legacy "Carne Max".
-- Prices, historical orders and inventory balances are deliberately retained.
update public.menu m set recipe=(
 select jsonb_agg(case when part->>'ingredientId' in (
   'ing-carne-max', (select id::text from public.inventory where tenant_id=m.tenant_id and code='ing-carne-max')
 ) then jsonb_build_object('ingredientId','ing-hamburguer','qty',3) else part end order by position)
 from jsonb_array_elements(m.recipe) with ordinality r(part,position)
)
where m.tenant_id='8c0d61b8-7cf9-44e0-9e17-96832f3848b6'
 and m.code in('c-max','c-xmax','c-xmaxegg','c-xmaxcalabresa','c-xmaxbacon','c-xmaxcalabresaegg','c-xmaxbaconegg','c-xmaxtudo')
 and exists(select 1 from jsonb_array_elements(m.recipe) r where r->>'ingredientId' in (
  'ing-carne-max',(select id::text from public.inventory where tenant_id=m.tenant_id and code='ing-carne-max')
 ));
