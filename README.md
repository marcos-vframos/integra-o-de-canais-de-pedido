# Loyola's Lanches — Sistema Integrado de Pedidos e Gestão

SPA de delivery com landing institucional, loja do cliente, gestão/PDV e CMS da landing, usando React, Vite, TypeScript, Tailwind e PocketBase.

## Canais

- `/` — landing pública: conteúdo dinâmico, cardápio em destaque, tema em tempo real e campanhas sazonais.
- `/loja` — pedidos online: categorias, customização, Gourmet, vouchers, retirada/entrega e taxa por proximidade.
- `/gestao` — operação/PDV: balcão, pedidos online, estoque, motoboys e fechamento de caixa por origem.
- `/adm-landing` — CMS da landing: textos, imagens, paletas, presets, campanhas sazonais e status da loja.
- `/config` — configurações protegidas.

A arquitetura detalhada, regras de negócio e mapa do PocketBase estão em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Stack

React 19 · Vite 8 · TypeScript 6 · Tailwind CSS 3 · React Router 7 · PocketBase JS SDK 0.26 · shadcn/Radix.

O cliente PocketBase é único e fica em `src/lib/pocketbase/client.ts`. A URL vem de `VITE_POCKETBASE_URL`.

## Desenvolvimento

```bash
npm install
npm run dev
```

Validação:

```bash
npm run lint
npm run build
```

> O projeto ainda não possui suíte automatizada real; o script `npm test` atual é apenas um placeholder.

## Regras críticas

**Gourmet:** Catupiry OU Cheddar pode ser escolhido gratuitamente. Se o cliente escolher ambos, uma opção permanece gratuita e a outra é cobrada.

**Pedidos:** `pocketbase/hooks/orders_finalize.js` centraliza a finalização, baixa de estoque, CRM e vouchers. Mudanças nessa rota devem preservar consistência de estoque e idempotência.

**Entrega:** a taxa é definida a partir das regras de `delivery_fees` e proximidade/localização do pedido.

**Caixa:** pedidos de balcão e online mantêm a origem separada para fechamento e auditoria.

**Campanhas:** `seasonal_campaigns` pode aplicar temporariamente paleta, imagem, mensagem e CTA à landing. A campanha só entra em vigor quando `active=true` e a data atual estiver entre `startDate` e `endDate` (quando informadas). Ao terminar, a paleta normal de `landing_content/theme` volta automaticamente.

## Deploy contínuo — Netlify

O repositório inclui `netlify.toml`:

- build: `npm run build`
- diretório publicado: `dist`
- fallback SPA: `/* -> /index.html`
- Node 22

No Netlify, conecte este repositório e cadastre a variável:

```
VITE_POCKETBASE_URL=https://URL-PUBLICA-DO-SEU-POCKETBASE
```

Cada push na branch configurada no Netlify gera um novo deploy. Pull requests/branches podem gerar Deploy Previews conforme a configuração do site.

O PocketBase precisa estar hospedado separadamente e acessível via HTTPS pelo navegador; o Netlify hospeda o frontend estático, não o processo PocketBase.

## Ambiente

Copie `.env.example` para `.env.local` no desenvolvimento local e informe a URL do backend. Não versione credenciais administrativas do PocketBase.

## Estrutura principal

```text
src/
  components/                 UI, PDV e componentes da landing
  context/                    autenticação, carrinho, tema e landing CMS
  hooks/                      realtime, PWA e utilitários React
  lib/pocketbase/             cliente e schema de referência
  pages/                      rotas principais
pocketbase/
  hooks/                      regras server-side
  migrations/                 evolução do schema
docs/ARQUITETURA.md
netlify.toml
```
