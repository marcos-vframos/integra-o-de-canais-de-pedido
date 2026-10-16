# Loyola's Lanches — Site de pedidos + Gestor PWA independente

O repositório contém **dois aplicativos gerados em builds distintos**, com lógica compartilhada, e um backend PocketBase preparado para hospedagem persistente no Railway.

## Arquitetura atual da branch de revisão

- **Site público (Vercel):** rota `/`, cardápio nativo em destaque, botão **Pedir** abre as opções de montagem da Loja na própria página, busca de produtos, promoções e cesta lateral. **Minha Conta** abre o drawer de cliente. `/loja` segue como rota legada de compatibilidade.
- **Gestor PWA (segundo projeto Vercel):** rotas `/gestao`, `/config`, `/adm-landing`, login em `/login`. Compilação independente com `npm run build:gestao`, saída `dist-gestao`.
- **PocketBase independente (ainda não provisionado):** `deploy/pocketbase/Dockerfile` e `railway.toml`; precisa de serviço Railway com volume montado em `/data`, domínio HTTPS e administração inicial. A migração de dados do provedor antigo não foi efetuada.

## Como executar

```bash
pnpm install
cp .env.example .env  # Windows: copiar manualmente
# Editar VITE_POCKETBASE_URL com URL HTTPS do PocketBase independente
pnpm dev
pnpm build:cliente
pnpm build:gestao
```

## Ordem segura para publicação

1. Provisionar servidor PocketBase e volume persistente; aplicar migrations `pocketbase/migrations` e hooks `pocketbase/hooks`.
2. Configurar superusuário e contas **users** no PocketBase; cadastro público de contas operacionais está bloqueado.
3. Executar teste de checkout na API `/backend/v1/orders/finalize` (totais e estoque recalculados no servidor). Testar backup e restauração.
4. Definir `VITE_POCKETBASE_URL` em ambos os projetos Vercel e publicar novamente.
5. Associar domínio `www` ao site, `gestao` ao PWA e `api` ao PocketBase.

## Estado de segurança

- A URL antiga da Skip não é utilizada no novo cliente: foi removida do código rastreado, e URLs `.internal.goskip.dev` são recusadas pelo cliente PocketBase. O projeto de produção anterior continua intocado até a migração ser validada.
- `pocketbase/migrations/0007_secure_collections.js` fecha APIs administrativas e cadastros privados.
- `orders_finalize.pb.js` faz pedidos em transação com preços e taxas verificados no servidor e idempotência.
- **Ainda falta:** autenticação do cliente por código (WhatsApp/SMS/e-mail) para liberar Minha Conta, histórico, vouchers pessoais e exclusão de cadastro com garantia de identidade; integração fiscal real para emissão de NF. O checkout fica bloqueado no modo demonstração sem PocketBase configurado.
- É necessário revisar a política de permissões, CORS, limites de requisições, migração de dados, e validar em dispositivos antes de receber tráfego real.

Veja também: [Arquitetura anterior](docs/ARQUITETURA.md), [Plano de separação](docs/PLANO_SITE_UNIFICADO_GESTOR_PWA_2026-10-16.md) e [Railway backend](deploy/pocketbase/README.md).
