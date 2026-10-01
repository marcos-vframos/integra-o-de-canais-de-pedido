# Loyola's Lanches — Documentação de Arquitetura e Guia para Outras IAs / Desenvolvedores

Este documento foi elaborado para permitir que **outra Inteligência Artificial (ou qualquer desenvolvedor)** compreenda, opere, edite e dê manutenção em todo o sistema de ponta a ponta, sem quebrar os canais independentes ou a integridade dos dados.

---

## 1. Visão Geral da Stack Tecnológica

- **Frontend:** React 18, Vite 5, TypeScript 5, Tailwind CSS, shadcn/ui.
- **Roteamento:** `react-router-dom` v6 em Single Page Application (SPA).
- **Backend & Banco de Dados:** PocketBase (Skip Cloud) provisionado nativamente com Realtime Subscriptions via SSE (`pb.collection(...).subscribe`).
- **PWA & Offline First:** Service Worker registrado em `src/lib/pwa/registerServiceWorker.ts`, manifest PWA, fila offline com `localStorage` e sincronização automática idempotente (`src/lib/offlineSync.ts`).
- **Estilos:** Três paletas visuais intencionalmente distintas para cada canal (descritas na Seção 4).

---

## 2. Variáveis de Ambiente e Conexão

O frontend se conecta ao PocketBase através de:

- `VITE_POCKETBASE_URL` (definido no ambiente ou padrão relativo `/` quando servido pelo backend).
- O cliente PocketBase é instanciado em **único ponto canônico**: `src/lib/pocketbase/client.ts`. **Nunca recrie instâncias adicionais do PocketBase no código.**

---

## 3. Os Três Canais do Sistema e Rotas

O projeto integra três canais com funções e identidades visuais bem definidas:

### 3.1. Canal 1: Landing Page Institucional (`/`)

- **Arquivo Principal:** `src/pages/Index.tsx` e componentes em `src/components/` (`Header.tsx`, `Hero.tsx`, `Story.tsx`, `FeaturedMenu.tsx`, `Reviews.tsx`, `InstagramSection.tsx`, `OrderCTA.tsx`, `LocationHours.tsx`, `Footer.tsx`).
- **Identidade Visual:** Verde Oliva Escuro (`#07140B`), Vinho Nobre (`#8F0F1B`) e Prata (`#C4C4C4`).
- **Função:** Apresentação da história (18 anos de tradição em Araretama / Pindamonhangaba), cardápio em destaque canônico, prova social de avaliações 5.0, fotos de bastidores e redirecionamento para o app de pedidos.
- **Dinâmica:** Lê textos, fotos e paletas de cores em tempo real da coleção `landing_content`.

### 3.2. Canal 2: Loja do Cliente — Pedidos Online (`/loja`)

- **Arquivo Principal:** `src/pages/LojaPublica.tsx`.
- **Identidade Visual:** Carvão Profundo (`#09090B`), Vermelho Vibrante (`#E10600`) e Dourado/Prata.
- **Função:** Aplicativo mobile-first e desktop para o cliente final navegar pelas categorias do cardápio, customizar ingredientes (retirar itens, adicionar extras), usufruir da **cortesia Gourmet** (Catupiry ou Cheddar grátis), fechar o pedido (Entrega ou Retirada) e enviar direto para a cozinha com feedback sonoro/visual.

### 3.3. Canal 3: Painel de Gestão Operacional / PDV / PWA (`/gestao`)

- **Arquivo Principal:** `src/pages/Gestao.tsx` e abas em `src/components/` (`TabPedido.tsx`, `TabPedidosOnline.tsx`, `TabCardapio.tsx`, `TabEstoque.tsx`, `TabCaixa.tsx`).
- **Identidade Visual:** Preto Técnico (`#050505`), Vermelho Crimson (`#E10600`) e bordas nítidas.
- **Função:** Operação de balcão (lançamento manual de comandas), gestão dos pedidos online que chegam em tempo real da `/loja` com alerta sonoro contínuo e decisão manual do operador (Aceitar / Despachar / Concluir / Recusar), controle de estoque em tempo real com baixa automática de insumos por receita, edição do cardápio e fechamento de caixa detalhado.
- **PWA:** Instalável como app standalone no celular ou tablet do operador.

### 3.4. Rota Especial: Área Administrativa da Landing (`/adm-landing`)

- **Arquivo Principal:** `src/pages/AdmLanding.tsx`.
- **Função:** Permite ao operador editar **todos os textos** e **todas as imagens** da Landing Page via upload direto para o PocketBase, escolher e montar paletas de cores completas estilo Adobe (HSV com rodas de saturação e valores HEX/RGB), salvar presets temáticos (ex: "Promoção", "Natal", "Black Friday") e alternar entre horário automático e override manual (Abrir/Fechar loja).

---

## 4. Coleções do PocketBase e Como se Relacionam

As coleções estão definidas nas migrações em `pocketbase/migrations/`:

| Coleção           | Descrição & Campos Principais                                                                                                                                                                                           | Relação                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `menu`            | Itens do cardápio (`name`, `price`, `category`, `active`, `recipe` [JSON com insumos e quantidades gastas por unidade]).                                                                                                | É lido pela Landing (`/`), pela Loja (`/loja`) e gerenciado no Gestor (`/gestao` na aba Cardápio).                     |
| `inventory`       | Itens de estoque de insumos (`name`, `unit`, `qty`, `min`, `group`).                                                                                                                                                    | Alimentam as receitas (`recipe`) dos itens do cardápio e sofrem deduções automáticas ao finalizar pedidos.             |
| `orders`          | Comandas e pedidos (`ticketNumber`, `origin` ['balcao' ou 'online'], `items`, `subtotal`, `discount`, `deliveryFee`, `total`, `payment`, `status`, `customerName`, `customerPhone`, `deliveryType`, `customerAddress`). | Gerados pelo balcão em `/gestao` ou pela `/loja`. Manipulados na aba Pedidos Online e abatidos no Fechamento de Caixa. |
| `closures`        | Fechamentos de turno e caixa do operador (`openedAt`, `closedAt`, `grossTotal`, `netTotal`, `discount`, `byPayment`, `ordersCount`, `productBreakdown`, `byOriginCount`, `byOriginTotals`).                             | Registrados na aba Caixa da Gestão ao encerrar o expediente.                                                           |
| `settings`        | Configurações chave/valor (`is_open`, `force_open`, `force_closed`, `store_name`, `ticket_counter`).                                                                                                                    | Sincronizados em tempo real com todos os canais para controlar status e nomes.                                         |
| `landing_content` | Conteúdo dinâmico da Landing Page (`section`, `data` [JSON], `image` [arquivo]).                                                                                                                                        | Seções: `hero`, `story`, `menu_header`, `reviews`, `instagram`, `order_cta`, `location_hours`, `footer`, `theme`.      |
| `users`           | Usuários autenticados e operadores.                                                                                                                                                                                     | Usado pelo AuthContext para controle de acesso.                                                                        |

---

## 5. Regras de Negócio Críticas (Não Modificar de Forma Destrutiva)

1. **Decisões 100% Manuais do Operador:**
   - **Nenhum pedido online é aceito ou recusado automaticamente.** O operador deve clicar nos botões do painel `/gestao` para mudar status (`pendente` → `em_preparo` → `em_rota` → `entregue` ou `recusado`).
2. **Exceção Gourmet:**
   - Para qualquer item cuja categoria seja `Gourmet`, o cliente tem direito a **1 cortesia gratuita**: Catupiry grátis OU Cheddar grátis OU nenhum.
   - Caso o cliente escolha **ambos**, o primeiro permanece gratuito e o segundo é cobrado pelo preço do adicional cadastrado no cardápio/estoque (ex: R$ 4,00 Catupiry ou R$ 3,00 Cheddar).
   - Implementado no modal compartilhado `src/components/CustomizeModal.tsx` e refletido nos cálculos em `LojaPublica.tsx`, `Gestao.tsx` e `TabPedido.tsx`.
3. **Status Aberto / Fechado:**
   - Se `force_open == "true"`: loja SEMPRE aberta (sobreposição manual).
   - Se `force_closed == "true"`: loja SEMPRE fechada (sobreposição manual para chuva, eventos ou pausas).
   - Se ambos forem falsos: segue o horário automático de `checkIsOpenNow()` (Qua a Seg das 19h às 23h30).
   - Qualquer alteração em `settings` é propagada em milissegundos via SSE (`useRealtime`).
4. **Isolamento de Canais:**
   - Nunca importe estilos ou CSS da Loja na Landing ou vice-versa. A Landing usa `.landing-scope` e variáveis CSS (`--landing-bg-primary`, etc.); a Loja usa classes Tailwind escuras `#09090B`; a Gestão usa classes prefixadas `.sc-*`.

---

## 6. Como Executar e Testar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Rodar ambiente de desenvolvimento Vite
npm run dev

# 3. Executar typecheck e build
npm run build

# 4. Executar verificação de linter
npm run lint
```

---

## 7. Como Instalar o PWA de Gestão

1. Acesse `/gestao` pelo navegador Chrome no celular Android ou Safari no iOS.
2. No Android: Clique no banner "Instalar Aplicativo" ou no menu do navegador ⋮ -> "Instalar aplicativo" / "Adicionar à tela de início".
3. No iOS: Toque no botão Compartilhar (quadrado com seta para cima) -> "Adicionar à Tela de Início".
4. O app roda em tela cheia (standalone) com suporte a modo offline completo para balcão.

---

## 8. Guia Rápido: Onde Encontrar Cada Coisa para Outra IA

- Quer mudar textos da landing? Altere em `src/pages/AdmLanding.tsx` ou via banco na coleção `landing_content`.
- Quer mudar regras de impressão de comanda? Veja `src/components/ReceiptModal.tsx` e `printOrderTicket()` em `Gestao.tsx`.
- Quer ajustar os complementos de receitas e baixa de estoque? Veja `deductions` em `LojaPublica.tsx` e `pocketbase/hooks/orders_finalize.js`.
- Quer criar novas migrações no banco? Use a pasta `pocketbase/migrations/` seguindo a convenção `000X_nome_da_migracao.js` com `$app.save(collection)`.
