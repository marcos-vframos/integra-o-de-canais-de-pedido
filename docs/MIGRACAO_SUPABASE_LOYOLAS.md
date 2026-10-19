# MIGRAÇÃO LOYOLA'S → SUPABASE — BASE DE TRABALHO
**Branch:** `supabase-estrutura-inicial-20261016`  
**Estado em 19/10/2026:** projeto Supabase **criado e HEALTHY**, baseline SQL aplicado, 14 tabelas PostgreSQL, isolamento RLS ativado, tenant Loyola's Lanches em `DRAFT`, bucket de mídia de campanhas criado e auditoria de segurança do Supabase sem avisos. **194 registros operacionais já importados e conferidos no Supabase; frontend ainda não integrado, três imagens e contas de acesso pendentes**.

## 1. Por que esta migração
O frontend público (Landing + Loja) e o Gestor PWA estão publicados em projetos Vercel separados. O app foi escrito contra o SDK do PocketBase: uma conexão Supabase nova NÃO substitui a API automaticamente. Sem migrar o adaptador de dados, o app continua em modo demonstração e operações de escrita não são persistidas.

O Supabase foi conectado na organização `Work Space of Marcos` (plano Free). O projeto `Loyola's Lanches` foi criado em São Paulo (`sa-east-1`) com custo inicial informado de US$ 0/mês. ID: `awgqpfdfsyslpqpfzoul`. URL pública da API: `https://awgqpfdfsyslpqpfzoul.supabase.co`. Verificar eventuais custos de consumo e limites do plano antes de iniciar o uso comercial.

## Status da implantação no Supabase (19/10/2026)
- [x] Organização confirmada e custo cotado: US$ 0/mês para o novo projeto.
- [x] Projeto `awgqpfdfsyslpqpfzoul` criado em `sa-east-1`, estado `ACTIVE_HEALTHY`.
- [x] Migração `loyolas_baseline_tenant_rls_v1` aplicada: 14 tabelas, RLS habilitado.
- [x] Migração `permission_functions_private` aplicada: funções de validação de acesso movidas para `app_private`, fora da API pública.
- [x] Migração `campaign_storage_tenant_policies` aplicada: bucket `loyolas-public-media` e upload restrito por empresa.
- [x] Auditoria automatizada de segurança: nenhuma recomendação detectada após ajustes.
- [x] Tenant `loyolas-lanches` criado em `DRAFT`, sem catálogo importado e sem usuários associados.
- [x] Backup original do PocketBase recebido e validado: 194 registros operacionais importados; identificadores legados preservados e senha/token excluídos.\n- [ ] Transferir 3 imagens do backup para o Supabase Storage; manifesto privado gerado.\n- [x] Migração `landing_media_storage_policies` aplicada: escrita em `landing/` e `campaigns/` somente por dono/gerente do tenant.
- [ ] Configurar autenticação Supabase Auth, criar a conta do proprietário e associá-la ao tenant.
- [ ] Substituir os acessos PocketBase do frontend pelos adaptadores Supabase.
- [ ] Implementar Edge Functions de finalização de pedido, descontos, estoques e fechamento de caixa.
- [ ] Configurar os dois projetos Vercel com a nova URL/chave publishable e validar F5/Reatime.
- [ ] Homologar em aparelhos, conferir fluxo de compra e publicar somente após aprovação.

## 2. Arquivos de partida
- `src/lib/pocketbase/schema.json`: mapeamento das coleções de origem.
- `pocketbase/migrations/`: histórico da estrutura e operações existentes.
- `pocketbase/hooks/orders_finalize.js`: regras originais de finalização a analisar antes da migração.
- `supabase/migrations/20261016_000001_loyolas_baseline.sql`: rascunho SQL do schema PostgreSQL e regras RLS. Exige revisão antes da aplicação.
- `src/lib/pocketbase/client.ts`: cliente que será substituído por módulo `src/lib/supabase/client.ts`.
- `src/context/LandingContentContext.tsx`, `src/pages/Gestao.tsx`, `src/pages/LojaPublica.tsx`: consumidores principais da API.
- `src/components/SeasonalCampaignAdmin.tsx`, `src/components/SeasonalCampaignOverlay.tsx`: administração e visualização de campanhas.
- `vercel.json`, `package.json`, `vite.config.ts`: hospedagem dos dois builds.

## 3. Tabelas previstas
| PocketBase | Supabase | Conversão relevante |
|---|---|---|
| users | `auth.users` + `tenant_memberships` | Não copiar senhas/tokens entre provedores; contas terão que ser migradas por fluxo suportado ou recriadas |
| menu | menu | recipe JSON → JSONB, preço → NUMERIC(12,2) |
| categories | categories | order → sort_order |
| inventory | inventory | min → min_qty; group → inventory_group |
| orders | orders | items JSON → JSONB; ticketNumber → ticket_number; deliveryFee → delivery_fee |
| closures | closures | byPayment, productBreakdown → JSONB |
| settings | settings | key/value por tenant |
| landing_content | landing_content | section/data JSONB; image → Storage |
| motoboys | motoboys | feePerDelivery → fee_per_delivery |
| delivery_fees | delivery_fees | fee, lat/lng, area_geojson para polígonos |
| customers | customers | telefone único dentro do tenant; **não importar passcode em texto claro** |
| campaigns | campaigns | vouchers; usado/ativo; validade e produto alvo |
| seasonal_campaigns | seasonal_campaigns | paleta, imagens e media_path no Storage |

O campo `legacy_id` preserva o vínculo com PocketBase para importar referências e reconciliar registros; o `id` operacional em Supabase é UUID.

## 4. Isolamento multiempresa
Toda tabela de negócio inclui `tenant_id`. Usuários administrativos se vinculam a tenants em `tenant_memberships`; as políticas RLS impedem cruzamento de informações privadas entre empresas. As leituras públicas permitem apenas catálogo ativo e conteúdo da Landing de tenants publicados. Os clientes nunca podem ler a lista global de outros clientes nem modificar pedidos.

O funcionamento de um aplicativo para UMA empresa também precisa filtrar por `tenant_id` ou por domínio/slug resolvido no servidor. Não confie em um ID enviado pelo cliente para conceder permissão.

## 5. Segurança no MVP
- **Gerência e ADM com dados reais requerem autenticação.** Não usar login desligado com banco real. Para testes sem login, manter mock local e sem gravação sensível.
- Políticas de edição no primeiro schema permitem owner/manager alterar catálogo, estoque, taxas e campanhas; permissões detalhadas por caixa/cozinha/entregador serão refinadas em versões posteriores.
- Finalização de pedido deve ocorrer em Edge Function ou RPC segura, **com transação** e cálculo servidor: preço, pão francês + R$2/unidade, ingredientes, cupom, entrega, total, baixa de estoque e idempotência. O usuário anônimo não pode gravar diretamente em `orders`.
- Não expor `service_role` ou secret keys em variáveis `VITE_*`. Use somente chave publishable no navegador, protegida por RLS.
- Clientes, histórico, exclusão de conta, LGPD, auditoria e retenção exigem fluxos próprios.
- Uploads de mídia para Storage devem ter caminho com tenant, MIME permitido, tamanho máximo e políticas seguras.
- NF/NFC-e exige integração fiscal validada; não declarar emitida antes da confirmação do provedor fiscal.

## 6. Passo a passo de implantação
1. **Concluído:** organização/custo confirmados e projeto Supabase criado na região de São Paulo.
2. **Concluído:** baseline aplicada no banco novo, tabelas verificadas com RLS ativo e auditoria de segurança sem avisos.
3. Configurar `supabase-js` no React, criar adaptadores de leitura para Landing e Catálogo, sem substituir todos os módulos no mesmo commit.
4. Implementar autenticação, RBAC, Storage e APIs de escrita; testar isolamento, IDOR e tentativas anônimas.
5. **Concluído para registros:** backup PocketBase recebido, validado por SQLite e 194 registros importados, com `legacy_id`. **Pendente:** envio de três mídias ao Storage.
6. Importar dados em ordem: tenants → categorias/cardápio/estoque → clientes → campanhas → pedidos/caixa → anexos.
7. Conferir contagem, totais, hashes de anexos e amostras; realizar testes reais em ambiente isolado.
8. Configurar **ambos** os projetos Vercel com o **mesmo URL Supabase**, a chave publishable e o tenant apropriado.
9. Testar: criar campanha no Gestor → verificar no banco → abrir Landing → F5 (ou Realtime) → ver campanha.
10. Somente após homologação, desativar a infraestrutura PocketBase/Skip. Manter backup e opção de rollback pelo prazo definido.

## 7. Variáveis de ambiente previstas
```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_TENANT_SLUG=loyolas-lanches
```
Essas variáveis são **especificação futura**, ainda não consumidas pelo código atual. As versões Vercel dependem de novos builds após alterar variáveis. As configurações do banco continuam no servidor.

## 8. Critérios objetivos de aceite
- [x] Projeto Supabase real criado e migração SQL aplicada com sucesso.
- [ ] Políticas RLS testadas: anônimo não modifica tabelas, staff de outro tenant não acessa dados.
- [ ] Landing carrega catálogo da API Supabase.
- [ ] Gestor edita paletas, campanhas, textos e cardápio; alterações chegam na Landing.
- [ ] Imagens/vídeos são armazenados em Storage com URLs válidas.
- [ ] Um pedido completo registra preço correto, cupom, entrega, pão francês e baixa de estoque apenas uma vez.
- [ ] Gestor no PWA e Landing compartilham dados **sem compartilhar sessão/cookies administrativos**.
- [ ] Backups e restauração testados; não há URL interna da Skip em deploy final.
- [ ] F5 busca o novo build depois de `READY`; alterações de dados podem ser visualizadas sem redeploy.

## 9. Pontos ainda não concluídos
A estrutura SQL e **194 registros operacionais de 12 coleções** já estão importados no Supabase. Contagens conferidas: 87 menu, 50 estoque, 17 pedidos, 12 Landing, 9 configurações, 8 categorias, 6 taxas, 2 clientes, 1 motoboy, 1 campanha sazonal, 1 fechamento de caixa e 0 cupons. **Três imagens** ainda precisam ser transferidas para o Storage. Usuários PocketBase (senhas e tokens) não foram importados por segurança. O frontend Vercel ainda não consulta o Supabase; PocketBase/Skip permanece intacto. Tenant em DRAFT, sem usuários Auth nem vinculações. Publicação na Vercel depende de deploy homologado.
