# MIGRAÇÃO LOYOLA'S → SUPABASE — BASE DE TRABALHO
**Branch:** `supabase-estrutura-inicial-20261016`  
**Estado:** planejamento + SQL versionado no GitHub. **NÃO aplicado** em projeto Supabase.

## 1. Por que esta migração
O frontend público (Landing + Loja) e o Gestor PWA estão publicados em projetos Vercel separados. O app foi escrito contra o SDK do PocketBase: uma conexão Supabase nova NÃO substitui a API automaticamente. Sem migrar o adaptador de dados, o app continua em modo demonstração e operações de escrita não são persistidas.

Atualmente a integração Supabase do ChatGPT está conectada, mas ainda **não existe um projeto Supabase** na organização detectada (`Work Space of Marcos`). Antes de criar qualquer projeto, confirme com o proprietário a organização; consulte o custo específico dessa organização e não gere despesa sem autorização.

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
1. Confirmar a organização Supabase e a cotação de custo. Criar o projeto, se autorizado.
2. Executar auditoria de tabelas existentes para evitar conflito; aplicar migração apenas em projeto novo/dedicado e após revisão.
3. Configurar `supabase-js` no React, criar adaptadores de leitura para Landing e Catálogo, sem substituir todos os módulos no mesmo commit.
4. Implementar autenticação, RBAC, Storage e APIs de escrita; testar isolamento, IDOR e tentativas anônimas.
5. Exportar backup integral do PocketBase antigo: registros + arquivos (evitar migrar sem ele). Mapear IDs e referências.
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
- [ ] Projeto Supabase real criado e migração SQL aplicada com sucesso.
- [ ] Políticas RLS testadas: anônimo não modifica tabelas, staff de outro tenant não acessa dados.
- [ ] Landing carrega catálogo da API Supabase.
- [ ] Gestor edita paletas, campanhas, textos e cardápio; alterações chegam na Landing.
- [ ] Imagens/vídeos são armazenados em Storage com URLs válidas.
- [ ] Um pedido completo registra preço correto, cupom, entrega, pão francês e baixa de estoque apenas uma vez.
- [ ] Gestor no PWA e Landing compartilham dados **sem compartilhar sessão/cookies administrativos**.
- [ ] Backups e restauração testados; não há URL interna da Skip em deploy final.
- [ ] F5 busca o novo build depois de `READY`; alterações de dados podem ser visualizadas sem redeploy.

## 9. Pontos ainda não concluídos
A migração SQL é uma base proposta, não uma migração executada, e suas políticas devem passar por auditoria antes da aplicação. Não houve exportação do banco antigo nem criação de projeto Supabase. Os deploys recentes podem permanecer limitados por quota da Vercel.
