begin;
-- These tests never invoke the HTTP worker or send a message. Every fixture is rolled back.
do $test$
declare t uuid:='8c0d61b8-7cf9-44e0-9e17-96832f3848b6';r jsonb;v jsonb;token text;c uuid;oid uuid;birthday uuid;challenge uuid;expires timestamptz;sid uuid;did uuid;day date:=(now() at time zone 'America/Sao_Paulo')::date;test_at timestamptz;blocked boolean;
begin
 if has_function_privilege('anon','public.customer_whatsapp_api(uuid,text,jsonb,text,uuid)','execute') or has_function_privilege('authenticated','public.customer_whatsapp_api(uuid,text,jsonb,text,uuid)','execute') then raise exception 'FAIL: RPC must not be public';end if;
 if has_table_privilege('anon','app_private.wa_sessions','select') or has_table_privilege('authenticated','app_private.wa_connections','select') then raise exception 'FAIL: private credentials/sessions exposed';end if;
 if exists(select 1 from app_private.wa_connections where tenant_id=t) then raise exception 'Tests require an unconfigured connection; do not overwrite live credentials';end if;
 sid:=vault.create_secret('{"accessToken":"test-only-no-network"}');insert into app_private.wa_connections(tenant_id,secret_id,enabled) values(t,sid,true);
 r:=public.customer_whatsapp_api(t,'request_otp',jsonb_build_object('phone','11999999888','code','012345','ipHash','test-only'));
 challenge:=(r->>'challengeId')::uuid;
 r:=public.customer_whatsapp_api(t,'verify_otp',jsonb_build_object('challengeId',challenge,'code','000001','name','Teste rollback'));
 if not(r?'error') or (select attempts from app_private.wa_otps where id=challenge)<>1 then raise exception 'FAIL: failed attempts must persist';end if;
 r:=public.customer_whatsapp_api(t,'verify_otp',jsonb_build_object('challengeId',challenge,'code','012345','name','Teste rollback'));
 token:=r->>'token';c:=(r->'customer'->>'id')::uuid;
 if length(token)<>64 or c is null then raise exception 'FAIL: verified session missing';end if;
 if not exists(select 1 from app_private.wa_sessions where customer_id=c and token_hash=encode(extensions.digest(token,'sha256'),'hex')) then raise exception 'FAIL: session must be hashed';end if;
 r:=public.customer_whatsapp_api(t,'verify_otp',jsonb_build_object('challengeId',challenge,'code','012345','name','Teste rollback'));if not(r?'error') then raise exception 'FAIL: OTP reused';end if;
 blocked:=false;begin perform public.customer_whatsapp_api(gen_random_uuid(),'account','{}',token);exception when others then blocked:=true;end;if not blocked then raise exception 'FAIL: cross-tenant access';end if;
 blocked:=false;begin perform public.customer_whatsapp_api(t,'account','{}','fake');exception when others then blocked:=true;end;if not blocked then raise exception 'FAIL: unverified account';end if;
 update app_private.wa_sessions set expires_at=now()-interval '1 second' where customer_id=c;
 blocked:=false;begin perform public.customer_whatsapp_api(t,'account','{}',token);exception when others then blocked:=true;end;if not blocked then raise exception 'FAIL: expired session';end if;
 update app_private.wa_sessions set expires_at=now()+interval '30 days' where customer_id=c;
 -- Consent is explicitly off until the verified user chooses it.
 if (select whatsapp_updates or whatsapp_marketing from public.customers where id=c) then raise exception 'FAIL: implied consent';end if;
 perform public.customer_whatsapp_api(t,'profile',jsonb_build_object('birthDate',make_date(2000,extract(month from day)::int,extract(day from day)::int),'updates',true,'marketing',true),token);
 test_at:=(day+time '12:00') at time zone 'America/Sao_Paulo';
 if app_private.wa_queue_birthdays(test_at)<>1 or app_private.wa_queue_birthdays(test_at)<>0 then raise exception 'FAIL: birthday duplicate';end if;
 select campaign_id into birthday from app_private.wa_birthdays where customer_id=c;
 if exists(select 1 from public.campaigns where id=birthday and (active or expires_at is not null)) then raise exception 'FAIL: expiry before sending';end if;
 v:=public.customer_whatsapp_api(t,'claim',jsonb_build_object('dedupe','birthday:'||birthday));if jsonb_array_length(v)<>1 then raise exception 'FAIL: birthday not claimed';end if;
 perform public.customer_whatsapp_api(t,'ack',jsonb_build_object('id',v->0->>'id','providerId','wamid.rollback-test'));
 select expires_at into expires from public.campaigns where id=birthday and active and discount_percent=10 and expires_at=sent_at+interval '72 hours';if expires is null then raise exception 'FAIL: exact 72-hour voucher';end if;
 perform public.customer_whatsapp_api(t,'ack',jsonb_build_object('id',v->0->>'id','providerId','wamid.rollback-test'));
 if (select expires_at from public.campaigns where id=birthday)<>expires then raise exception 'FAIL: retry extends voucher';end if;
 -- State transitions are queued once each; a driver assignment means sent without changing accounting semantics.
 insert into public.orders(tenant_id,ticket_number,items,total,subtotal,discount,delivery_fee,payment,status,origin,customer_id,customer_name,customer_phone,delivery_type,customer_address,idempotency_key) values(t,987654321,'[]',1,1,0,0,'Dinheiro','pendente','online',c,'Teste rollback','11999999888','retirada','','ord-'||gen_random_uuid()) returning id into oid;
 update public.orders set status='aceito' where id=oid;update public.orders set status='em preparo' where id=oid;update public.orders set status='pronto' where id=oid;update public.orders set status='aceito' where id=oid;
 if (select count(*) from app_private.wa_outbox where dedupe like 'order:'||oid||':%')<>3 then raise exception 'FAIL: duplicate/missing transitions';end if;
 if app_private.wa_phase('pronto',gen_random_uuid())<>'enviado' then raise exception 'FAIL: dispatched phase';end if;
 r:=public.customer_whatsapp_api(t,'account','{}',token);if jsonb_array_length(r->'orders')<>1 then raise exception 'FAIL: own order not available';end if;
 blocked:=false;begin perform public.customer_whatsapp_api(t,'delete','{}',token);exception when others then blocked:=true;end;if not blocked then raise exception 'FAIL: deletion with active order';end if;
 update public.orders set status='concluído' where id=oid;
 perform public.customer_whatsapp_api(t,'delete','{}',token);
 if exists(select 1 from app_private.wa_sessions where customer_id=c) or exists(select 1 from public.campaigns where id=birthday and active) then raise exception 'FAIL: deletion must revoke sessions and coupons';end if;
 if (select total from public.orders where id=oid)<>1 or (select customer_phone from public.orders where id=oid)<>'' then raise exception 'FAIL: retain financial record but remove phone';end if;
 raise notice 'PASS: isolation, OTP, session expiry, consent, birthday idempotency/72h, state dedupe, deletion';
end $test$;
rollback;
