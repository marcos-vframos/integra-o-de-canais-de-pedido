# Testes integrados

A avaliação da Loyola usa o estado TRIAL com a configuração privada integration_test_mode=true. ACTIVE não foi habilitado. Outras empresas em TRIAL sem essa configuração não recebem marcação de teste.

O bloqueio local antigo de VITE_SUPABASE_DRAFT_MODE foi removido do envio. Essa variável agora identifica a interface de homologação e oculta Pix de cobrança. A autorização final para pedidos continua no servidor: DRAFT, SUSPENDED e demais estados não permitidos continuam bloqueados pelo checkout.

Pedidos novos são marcados no banco com payment_details.integrationTest=true e prefixo [TESTE] no nome da comanda. O navegador não escolhe essa marcação. Os pedidos percorrem o mesmo fluxo operacional e reduzem o estoque compartilhado. Podem aparecer nos totais de avaliação do Gestor e do painel. Não representam recebimentos bancários efetivos. Não há integração de cobrança automática habilitada por esta mudança.

O teste SQL executa checkout de retirada, verifica marcação no servidor, baixa exata e repetição idempotente, e reverte a transação inteira. Não retém comanda nem altera o saldo final. Testes manuais do proprietário permanecem gravados para conferência.

Antes de operar em produção, conferir os pedidos de teste, reconciliar saldos de estoque e caixa e desativar integration_test_mode. Trocar a interface para a configuração de produção e liberar a empresa pelo fluxo aprovado. Não excluir histórico nem repor estoque automaticamente: pedidos cancelados já podem ter devolvido suas quantidades.
