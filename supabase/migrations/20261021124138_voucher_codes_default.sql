alter table public.campaigns alter column voucher_code set default ('LOY-'||upper(left(replace(gen_random_uuid()::text,'-',''),10)));
