-- Explicit offer specification. One canonical product per campaign, optional free extras and an advertised unit price.
-- All values are verified against menu/inventory by checkout RPC, not trusted from browser.
alter table public.seasonal_campaigns
 add column if not exists offer jsonb not null default '{}'::jsonb;
comment on column public.seasonal_campaigns.offer is
 'Offer example: {"productId":"menu UUID","unitPrice":24.00,"included":[{"ingredientId":"stock UUID","qty":1}]}';
create index if not exists seasonal_campaigns_offer_product_idx
 on public.seasonal_campaigns ((offer->>'productId')) where offer ? 'productId';
