# Arquitetura proposta — Site unificado + Gestor independente

**Status:** planejamento técnico e primeira integração visual em branch de revisão. Este documento não afirma que os serviços de produção e a segurança estejam concluídos.

## 1. Estado atual verificado em 16/10/2026
- Frontend React/Vite/TypeScript/Tailwind publicado como UMA SPA na Vercel. Rotas existentes: `/`, `/loja`, `/gestao`, `/config`, `/adm-landing`.
- Nenhum domínio personalizado vinculado ao projeto Vercel consultado.
- `VITE_POCKETBASE_URL` ainda aponta para hostname interno da infraestrutura antiga; substituir por API PocketBase independente.
- O Gestor dispõe de manifesto PWA `public/manifest.webmanifest`, mas ainda é servido na mesma SPA/origem da landing.
- O site público oferecia acesso separado `/loja`. Na branch `landing-loja-integradas-20261016`, `Index.tsx` passou a renderizar `<LojaPublica embedded />` sob `/#fazer-pedido`.
- Botões Fazer Pedido, menu principal, CTA e seção Destaques passam a rolar até o cardápio de pedidos da própria landing. O drawer da cesta e checkout do módulo Loja foram preservados. `/loja` permanece como rota de compatibilidade.

## 2. Domínio e DNS
- Registrar domínio `nomedaloja.com.br` com titularidade do estabelecimento.
- Conectar raiz e/ou `www` ao projeto público da Vercel; obter DNS efetivo na tela de verificação do projeto.
- Conectar `gestao.nomedaloja.com.br` a PROJETO VERCEL SEPARADO para o Gestor.
- Conectar `api.nomedaloja.com.br` ao host HTTPS de PocketBase dedicado.
- Ativar TLS/HTTPS, redirecionamentos canônicos e verificação de DNS. Não apontar o backend para endpoint `.internal.goskip.dev`.
- Vercel Hobby só para uso pessoal não comercial, revisar plano Pro para uso comercial.

## 3. Separação de aplicações sem duplicar repositórios
Manter UM GitHub e pacotes compartilhados; gerar DOIS deployments com ciclos independentes:
**Web cliente** — `/`, `/#fazer-pedido`; preserve `/loja` para compatibilidade, sem acesso ao Gestor.
**Gestor PWA** — `/gestao`, `/config`, `/adm-landing`; instalação em aparelho a partir de `gestao.`.
Implementar entradas distintas por app-alvo, por exemplo `VITE_APP_TARGET=web|gestao`, preferencialmente com builds/entrypoints independentes para evitar carregar código administrativo na entrega pública.
A separação do frontend não isola o banco automaticamente; o backend deve identificar usuário e tenant e fazer RBAC/validação server-side.

## 4. Carrinho: caminho de migração
Nesta primeira fase a Landing incorpora o componente `LojaPublica` com a lógica original do carrinho `loyolas_customer_cart_v1`; o checkout não é reescrito.
O repositório também tem `CartContext.tsx` com outro storage `loyolas_cart_v1`. Remover duplicidade no futuro migrando todos os consumidores para um único `CustomerOrderProvider`, com schema versionado e atualização de quantidades, preço, pão, extras e vouchers.
Todos os totais precisam ser recalculados no servidor, não aceitos apenas do frontend.

## 5. Backend PocketBase independente
Provisionar servidor persistente (VPS ou PaaS que suporte processo HTTP contínuo + volume persistente). Configurar backup periódico de `pb_data`, restauração testada, observabilidade, TLS, atualizações.
Aplicar migrations e hooks da pasta `pocketbase/`, revisar compatibilidade com versão do PocketBase e garantir que descontos, taxas, estoque e recibos usem regras server-side.
Fechar API rules de `orders`, `customers`, `campaigns`, `inventory`, `landing_content` e `settings`. Nunca deixar mutações administrativas anônimas.
Gestor requer login protegido, papéis (proprietário, gerente, caixa, entregador), registros de auditoria e tratamento LGPD.

## 6. Como instalar o Gestor no dispositivo
Depois de publicado e seguro em `https://gestao.nomedaloja.com.br`:
Android Chrome/Edge: abrir link -> Instalar aplicativo / Adicionar à tela inicial.
iPhone/iPad Safari: Compartilhar -> Adicionar à Tela de Início -> Abrir como App (quando oferecido).
Windows/macOS Chrome/Edge: menu do navegador -> Instalar aplicativo; usar como janela própria e atalho.
Na primeira execução: autenticar, associar dispositivo e perfil, conceder notificações se necessárias, executar pedido e impressão de teste.
PWA não garante operação 100% offline. Definir política explícita para fila local, sincronização, reenvio idempotente, conflitos e impressoras.
Para integração avançada com impressora fiscal/ESC-POS, avaliar bridge local ou aplicativo nativo/Capacitor.

## 7. Critérios antes da publicação comercial
- [ ] DOMÍNIO DNS/HTTPS: URLs definitivas apontam para deployments certos
- [ ] SITE: entrar pelo Hero sem navegar para `/loja`; abrir catálogo embutido e cesta lateral
- [ ] PREÇOS: adicionais, pão francês +R$2/unid., cupom e entrega conferidos no backend
- [ ] PEDIDOS: venda de teste chega ao caixa UMA vez, com descontos, taxas e itens discriminados
- [ ] ESTOQUE: baixa uma vez; cancelamento e reprocessamento possuem testes
- [ ] SEGURANÇA: autenticação Gestor, API rules e isolamento validados
- [ ] PWA: ícones/manifesto próprios e instalação Android/iOS/desktop validados
- [ ] BACKUP: backup e restauração do PocketBase provados
- [ ] FISCAL: NF só marcada emitida após retorno válido de emissor homologado

## 8. Sequência indicada
A. Homologar a Landing + Loja na branch de revisão; consolidar carrinho.
B. Migrar PocketBase e proteger regras; testar checkout.
C. Separar builds Vercel e instalar Gestor PWA; rodar testes dos dispositivos.
D. Registrar domínio, DNS e certificados; publicação comercial e monitoração.
