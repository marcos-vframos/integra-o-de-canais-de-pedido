# Arquitetura — Loyola's Lanches

## 1. Visão geral

O sistema é uma SPA multi-canal. O frontend é React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 3 e usa React Router 7. O backend é PocketBase, acessado pelo SDK JavaScript. A conexão é configurada exclusivamente por `VITE_POCKETBASE_URL` e instanciada em `src/lib/pocketbase/client.ts`.

Fluxo lógico:

```text
Landing / Loja / Gestão / ADM
            │
            ▼
src/lib/pocketbase/client.ts
            │
            ▼
PocketBase ── collections + realtime + hooks
            │
            ├── orders_finalize.js
            └── migrations/
```

O frontend pode ser publicado como site estático no Netlify. O PocketBase é um serviço separado e precisa de hospedagem persistente própria.

## 2. Rotas e canais

### `/` — Landing pública
Entrada: `src/pages/Index.tsx`.

Componentes principais: `Header`, `Hero`, `Marquee`, `Story`, `FeaturedMenu`, `Reviews`, `InstagramSection`, `OrderCTA`, `LocationHours`, `Footer` e `SeasonalCampaignOverlay`.

O conteúdo editorial e a paleta permanente vêm de `landing_content`. `LandingContentContext` mantém o estado, sincroniza PocketBase realtime e publica os tokens CSS:

- `--landing-bg-primary`
- `--landing-bg-secondary`
- `--landing-bg-card`
- `--landing-vinho`
- `--landing-vinho-hover`
- `--landing-silver`

`src/main.css` traduz esses tokens também para classes legadas que ainda possuem os HEX originais, mantendo o tema restrito a `.landing-scope`.

### `/loja` — Loja do cliente
Entrada: `src/pages/LojaPublica.tsx`.

Responsabilidades: menu/categorias, busca, customização, carrinho, Gourmet, identificação do cliente, vouchers, entrega/retirada, taxa de entrega, pagamento e envio do pedido ao backend.

O carrinho do cliente possui persistência local. Menu, estoque e configurações recebem atualizações do PocketBase.

### `/gestao` — Gestão/PDV
Entrada: `src/pages/Gestao.tsx`, protegida por `ProtectedRoute` e `Layout`.

Responsabilidades: pedido de balcão, pedidos online, cardápio, estoque, motoboys, caixa, fechamento e operação offline. A fila offline é implementada em `src/lib/offlineQueue.ts` e sincronizada por `src/lib/offlineSync.ts`.

### `/adm-landing` — CMS da landing
Entrada: `src/pages/AdmLanding.tsx`.

Edita textos, imagens, presets de tema, paleta, campanhas sazonais e override de abertura/fechamento. O editor sazonal é `src/components/SeasonalCampaignAdmin.tsx`.

**Atenção:** atualmente esta rota não está envolvida pelo `ProtectedRoute` em `App.tsx`. Antes de produção, ela deve receber autenticação/autorização equivalente às áreas administrativas.

### Autenticação
`/login`, `/forgot-password`, `/reset-password`, `/verify-email` e `/confirm-email-change`. O estado de autenticação fica em `AuthContext`.

## 3. PocketBase

Coleções de domínio:

| Coleção | Papel |
|---|---|
| `menu` | produtos, preços, categoria, disponibilidade e receita/insumos |
| `inventory` | estoque, unidade, quantidade e mínimo |
| `orders` | pedidos, itens, valores, origem, entrega, pagamento, status e motoboy |
| `closures` | fechamentos, totais, pagamentos, produtos e totais por origem |
| `settings` | configurações chave/valor e estado operacional |
| `users` | autenticação de operadores |
| `categories` | categorias e ordenação do cardápio |
| `motoboys` | entregadores, contato, placa, atividade e taxa |
| `delivery_fees` | pontos/regras de taxa por localização/proximidade |
| `customers` | CRM: identificação, contato, endereço e histórico agregado |
| `campaigns` | vouchers/campanhas individuais de cliente |
| `seasonal_campaigns` | campanhas visuais temporárias da landing |
| `landing_content` | conteúdo e tema editáveis da landing |

As migrações ficam em `pocketbase/migrations/`. `src/lib/pocketbase/schema.json` é uma referência do schema e não substitui as migrações.

## 4. Finalização de pedidos

A rota server-side `pocketbase/hooks/orders_finalize.js` é o ponto de finalização. Ela participa de criação do pedido, baixa de estoque, CRM e validação/aplicação de vouchers.

Regra de engenharia: preço, desconto, voucher e baixa de estoque devem ser validados no servidor usando dados canônicos. O cliente não deve ser tratado como autoridade para valores financeiros ou quantidade de insumos.

Recusa/exclusão de pedidos deve restaurar estoque de maneira consistente e evitar fallbacks client-side que contornem a regra server-side.

## 5. Gourmet

Para itens da categoria Gourmet:

1. Catupiry **ou** Cheddar: uma opção gratuita.
2. Nenhum: sem adicional.
3. Ambos: uma opção é a cortesia e a outra é cobrada.
4. A regra deve permanecer coerente entre UI, total financeiro salvo e baixa/restauração de estoque.

A customização passa por `CustomizeModal.tsx` e pelos fluxos de loja/PDV.

## 6. Vouchers e CRM

`campaigns` armazena campanhas vinculáveis ao cliente, incluindo tipos como desconto percentual, frete grátis e desconto de produto. A validação final pertence ao backend. `customers` mantém dados e agregados usados pelo CRM; `orders_finalize.js` atualiza o histórico relacionado ao pedido.

## 7. Entrega e motoboys

`delivery_fees` contém referências geográficas e valores usados para determinar taxa por proximidade. A loja coleta/resolve a localização de entrega. `motoboys` representa entregadores e `orders` pode registrar motoboy, latitude e longitude de entrega.

## 8. Caixa

`orders.origin` distingue `balcao` de `online`. O fechamento em `closures` preserva contagem e totais por origem, além de meios de pagamento e detalhamento de produtos.

## 9. Tema da landing

A fonte permanente é a seção `theme` de `landing_content`, carregada pelo `LandingContentContext`. Presets padrão incluem identidade normal e ocasiões como promoção, Natal/festas e Black Friday; novos presets podem ser salvos no ADM.

A paleta deve ser consumida por variáveis CSS, nunca copiada como uma segunda fonte de verdade.

## 10. Campanhas sazonais

`seasonal_campaigns` possui título, selo, descrição, estado ativo, início/fim, CTA, paleta e imagens.

`SeasonalCampaignOverlay`:

1. carrega e assina realtime da coleção;
2. seleciona a primeira campanha `active=true` vigente;
3. combina a paleta sazonal com a paleta normal;
4. aplica os tokens CSS temporariamente;
5. apresenta overlay imersivo com imagem, mensagem e CTA;
6. permite fechar o overlay durante a visita;
7. restaura o tema normal quando a campanha deixa de estar vigente/desmonta.

Precedência visual: **campanha sazonal vigente > tema permanente > defaults do código**.

## 11. Realtime e offline

`use-realtime.ts` encapsula assinaturas do PocketBase. Menu, estoque, pedidos, settings, landing e campanhas podem reagir sem reload manual.

A Gestão possui caches em `localStorage` e fila offline. Sincronização deve ser idempotente: repetir uma tentativa de rede não pode criar pedidos duplicados.

## 12. Deploy contínuo

`netlify.toml` define:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

O rewrite é obrigatório para que rotas SPA abertas diretamente (`/loja`, `/gestao`, etc.) retornem `index.html`.

No provedor de deploy, configure `VITE_POCKETBASE_URL` com a URL HTTPS pública do PocketBase. Variáveis `VITE_*` são incorporadas ao bundle do frontend e **não podem conter segredos**.

Cada commit/push na branch de produção conectada dispara novo build. Branches/PRs podem ser usadas para previews antes de promover a produção.

## 13. Segurança antes de produção

Pontos que devem ser tratados como bloqueadores de produção:

- proteger `/adm-landing` com autenticação e autorização;
- revisar regras API do PocketBase por coleção, especialmente escrita/exclusão;
- não expor credenciais administrativas em `.env` ou variáveis `VITE_*`;
- validar preços, vouchers e deduções de estoque no servidor;
- eliminar fallbacks client-side que alterem pedidos/estoque fora dos hooks;
- adicionar testes reais para Gourmet, vouchers, estoque, rejeição/exclusão, offline/idempotência e fechamento.

## 14. Mapa de manutenção

- conexão PocketBase: `src/lib/pocketbase/client.ts`
- schema de referência: `src/lib/pocketbase/schema.json`
- migrações: `pocketbase/migrations/`
- finalização: `pocketbase/hooks/orders_finalize.js`
- landing CMS: `src/context/LandingContentContext.tsx`
- campanhas visuais: `SeasonalCampaignOverlay.tsx` / `SeasonalCampaignAdmin.tsx`
- loja: `src/pages/LojaPublica.tsx`
- gestão: `src/pages/Gestao.tsx`
- rotas: `src/App.tsx`
- deploy frontend: `netlify.toml`
