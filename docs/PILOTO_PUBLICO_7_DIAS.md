# Piloto público Loyola — 7 dias

Endereço da landing: https://loyolaslanchespinda.vercel.app/

O domínio está vinculado ao projeto existente e à branch feat-supabase-runtime-loyolas-20261019. A exceção pública da Vercel é restrita a esse alias. O Gestor conserva autenticação de operador; as demais proteções não foram alteradas.

As funções finalize-order, delivery-routing e google-business-profile aceitam a origem HTTPS exata do novo domínio. Origens anteriores foram preservadas; não foi adicionado curinga.

## Estado conferido em 30/10/2026

A empresa permanece TRIAL e integration_test_mode=true. O frontend ainda identifica testes e oculta o Pix de cobrança. A criação do domínio não inicia a contagem. O encerramento automático começa somente após a ativação manual pelo proprietário.

Há 135 taxas ativas, das quais 127 estão pendentes (8 prontas). Nenhum saldo de estoque está zerado na consulta. Há quatro pedidos registrados; não foram removidos nem alterados.

## Ordem para operação real

1. Conferir cardápio, preços, adicionais, horários, contato, origem da entrega e estoque físico.
2. Cadastrar as taxas dos bairros que serão atendidos; manter os demais bloqueados.
3. Conferir os quatro pedidos existentes e seus efeitos em estoque e caixa sem apagá-los automaticamente.
4. Definir os meios de pagamento efetivamente disponíveis e verificar o recebedor do Pix, caso usado; conferir redirects de recuperação de conta no domínio novo.
5. Usar /ativar-piloto no Gestor para liberar READY e iniciar as 168 horas. A alteração de modo é confirmada pelo servidor na mesma transação.
6. Fazer um pedido controlado de retirada e um de entrega pelo novo endereço; conferir total, comanda, estoque, motoboy, caixa e painel, com a impressora e os aparelhos reais da loja.
7. Operar durante sete dias com conferência diária de pedidos, recebimentos, estoque, entregas e falhas; testar recuperação de backup antes de depender do sistema como único registro.

As datas exatas serão definidas somente na ativação e exibidas no horário de Brasília. No término, a loja sai do ar para novos pedidos, com dados preservados.


## Ativação manual e encerramento automático (30/10/2026)

A preparação não inicia a contagem. O proprietário acessa a rota autenticada
`/ativar-piloto` no Gestor, confirma a conferência operacional e pressiona
“Ativar READY e iniciar meus 7 dias”. O mesmo card aparece nas configurações
do Gestor e do Painel de Controle. Um link no chat abre a tela; abrir o link,
fazer login ou recarregar a página nunca executa a ativação.

O servidor grava um único início e um vencimento exatamente 168 horas depois.
A interface mostra READY; internamente o estado compatível do tenant é ACTIVE.
A configuração privada `integration_test_mode` é desativada na mesma transação.
O checkout e o aviso de teste passam a usar o estado do servidor, sem depender
de recompilar variáveis de ambiente. Cliques repetidos não renovam o prazo.
Somente membros ativos com papel owner podem ativar; gerentes e clientes não.

No vencimento, o trigger de inserção de pedidos impede novos pedidos dentro
da transação de checkout, revertendo estoque e demais efeitos em caso de erro.
A interface pública mostra “Período de teste encerrado”. A rotina pg_cron
`loyolas-expire-seven-day-pilots`, executada a cada minuto, suspende o tenant
mesmo sem visitantes. O bloqueio de pedidos usa o relógio do banco e independe
do cron, do relógio do celular e de esta conversa permanecer aberta.
A hospedagem e o banco não são excluídos. O Gestor e o histórico permanecem
acessíveis para finalizar atendimentos e fechar caixa.

A migração apenas prepara Loyola com datas nulas. Nenhum piloto foi iniciado.
Não há botão de reinício ou extensão. A ativação não cadastra pagamentos,
taxas, equipamentos nem garante ausência de falhas: a conferência operacional
e os pedidos controlados descritos acima continuam necessários.

Teste: `supabase/tests/store_pilot_activation_expiry.sql` verifica permissões,
READY, intervalo exato, repetição, vencimento, rejeição de inserção, suspensão
e proibição de reinício. Executa tudo em transação com ROLLBACK, sem consumir
os sete dias ou alterar pedidos/estoque/caixa.
