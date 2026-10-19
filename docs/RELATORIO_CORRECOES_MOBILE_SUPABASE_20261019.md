# Correções de homologação — 19/10/2026

## Escopo implantado na branch de teste
Branch: `feat-supabase-runtime-loyolas-20261019` (não mesclada em `main`).
SHA homologado: `c6205666558a8bc9b7effb53aba8c9e61440fd04`.
- Cabeçalho do Gestor (Android/mobile): logo/nome limitado, controles de acesso em linha à direita, status Online e Aberto em coluna abaixo.
- Removido botão de instalação do cabeçalho do Gestor, e banner de instalação transferido para `/config` (ícone da engrenagem). A instalação aparece apenas quando o navegador suporta.
- Gestor em modo demonstração passou a carregar cardápio canônico do Supabase e parou de injetar `seedMenu`/estoque falso em caso de falha.
- RLS de preview para **dados de vitrine apenas**, tenant Loyola's em DRAFT. Os dados pessoais, pedidos, estoque privado, membros e fechamentos continuam protegidos.
- Segurança: os dados de catálogo e Landing do tenant DRAFT são publicamente legíveis nos links de preview; isso é intencional para homologação anônima, não autoriza escrita e deverá ser retirado antes da publicação final.

## Verificação
- `pnpm exec tsc --noEmit`: OK
- `pnpm run build:cliente`: OK
- `pnpm run build:gestao`: OK
- Vercel: ambos deploys SHA `c620566...` em estado READY.
- Branch aliases: HTTP 200 nos caminhos `/`, `/gestao`, `/config`.
- Teste de acesso `anon` no PostgreSQL: 87 produtos, 12 seções Landing, **0** pedidos, **0** clientes e **0** inventários privados.
- Storage: 3 imagens referenciadas em `landing_content`, todas verificadas com HTTP 200 (uma JPEG e duas PNG).
- Security Advisor Supabase: 0 avisos no momento do teste.
- Tenant mantido em DRAFT; nenhuma alteração realizada na produção (`main`).

## Pendências de homologação
- Conferência visual real em Android/iPhone pelo usuário (captura da área superior e carregamento de produtos).
- Autenticação e associação de conta administrativa Supabase para edição persistente e dados privados.
- Fluxo de checkout, estoque, caixa e pedidos reais ainda não liberado para produção.
- Remover políticas temporárias `loyolas_preview_*` ao ativar tenant e políticas definitivas.
- Testar edição de paleta e campanha com usuário autenticado, confirmar atualização na Landing via F5.
