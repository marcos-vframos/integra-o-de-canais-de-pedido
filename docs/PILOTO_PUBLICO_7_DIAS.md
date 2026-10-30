# Piloto público Loyola — 7 dias

Endereço da landing: https://loyolaslanchespinda.vercel.app/

O domínio está vinculado ao projeto existente e à branch feat-supabase-runtime-loyolas-20261019. A exceção pública da Vercel é restrita a esse alias. O Gestor conserva autenticação de operador; as demais proteções não foram alteradas.

As funções finalize-order, delivery-routing e google-business-profile aceitam a origem HTTPS exata do novo domínio. Origens anteriores foram preservadas; não foi adicionado curinga.

## Estado conferido em 30/10/2026

A empresa permanece TRIAL e integration_test_mode=true. O frontend ainda identifica testes e oculta o Pix de cobrança. A criação do domínio não ativa pagamentos, não transforma testes em vendas e não encerra o acesso automaticamente após sete dias.

Há 135 taxas ativas, das quais 127 estão pendentes (8 prontas). Nenhum saldo de estoque está zerado na consulta. Há quatro pedidos registrados; não foram removidos nem alterados.

## Ordem para operação real

1. Conferir cardápio, preços, adicionais, horários, contato, origem da entrega e estoque físico.
2. Cadastrar as taxas dos bairros que serão atendidos; manter os demais bloqueados.
3. Conferir os quatro pedidos existentes e seus efeitos em estoque e caixa sem apagá-los automaticamente.
4. Definir os meios de pagamento efetivamente disponíveis e verificar o recebedor do Pix, caso usado; conferir redirects de recuperação de conta no domínio novo.
5. Desativar a marcação privada de testes e publicar o frontend sem o modo de simulação, usando o fluxo autorizado de liberação da empresa. Não basta esconder o aviso.
6. Fazer um pedido controlado de retirada e um de entrega pelo novo endereço; conferir total, comanda, estoque, motoboy, caixa e painel, com a impressora e os aparelhos reais da loja.
7. Operar durante sete dias com conferência diária de pedidos, recebimentos, estoque, entregas e falhas; testar recuperação de backup antes de depender do sistema como único registro.

Se iniciado em 30/10, o período de sete dias termina em 06/11 no mesmo horário de início, no fuso America/Sao_Paulo. A revisão do piloto não deve excluir dados nem desligar o site automaticamente.
