# Relatórios de vendas, gastos e resultado estimado

Disponível em Painel de Controle → Financeiro → Produtos e margens.

Gerar calcula uma fotografia e exibe o resumo na tela. Não grava despesas, altera preços nem cria lançamentos. Imprimir usa o relatório já gerado e o diálogo do navegador, inclusive salvar como PDF. Exportar CSV inclui resumo, produtos, canais, meses-base, projeção e critérios. Alterar filtros exige gerar novamente antes de imprimir ou exportar.

Filtros: dia, semana (segunda a domingo), mês ou ano, data de referência, canal individual ou todos, base de despesas e janela de 3/6/12 meses anteriores. Datas de vendas seguem America/Sao_Paulo. Períodos em andamento são limitados à data atual.

Somente pedidos concluídos entram nas vendas. Quantidades, receita líquida dos itens, custos e resultado são apresentados por produto e no consolidado. Canal não informado permanece separado; não se presume que loja online significa WhatsApp.

Descontos da comanda são distribuídos pelos itens com fechamento em centavos. Frete e total da comanda são exibidos à parte. O resultado dos produtos não pretende apurar custo de entrega nem repasse bancário.

Custo variável: cadastro manual completo tem prioridade e não recebe taxas novamente. Sem cadastro manual, usa consumo registrado em stockDeductions e os custos atuais dos ingredientes. Sem consumo, a receita-base atual pode ser usada apenas quando não houver personalização sem custo identificável. Taxas do plano são aplicadas segundo a forma de pagamento. Custos ou taxas ausentes deixam o resultado pendente; não viram zero.

Despesas: escolher o plano mensal proporcional aos dias ou lançamentos confirmados por data registrada. As bases não são somadas. Despesas comuns são rateadas uma única vez pela participação na receita dos produtos de todos os canais; quando a receita é zero, pela quantidade. Sem vendas, despesas permanecem no consolidado como não atribuídas. Compras identificadas com category=stock_purchase não são somadas novamente ao consumo dos produtos.

Todos os custos de venda são estimativas feitas com os cadastros atuais. Não há snapshot histórico dos preços de compra. A correção depende da completude dos custos e lançamentos, da ausência de despesas duplicadas e da classificação correta de compras de estoque.

A projeção de 12 meses usa a média dos meses calendários encerrados anteriores à data escolhida com movimento registrado na loja. Requer ao menos dois meses. O mês atual da referência e meses futuros ficam fora. Meses sem registros não viram zeros; produtos sem vendas em meses observados recebem zero. Não se afirma que os dados de cada mês estejam completos nem se ajusta sazonalidade.

O relatório gerado permanece estável durante as atualizações automáticas do painel. Novos dados são sinalizados para regeneração. Fontes sem leitura confirmada bloqueiam a geração. CSV usa separador ponto e vírgula, UTF-8 com BOM e proteção contra fórmulas em nomes de produtos.
