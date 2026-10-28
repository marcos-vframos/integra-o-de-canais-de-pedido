# Painel de Controle

Ambiente do proprietário em `/painel-de-controle`, no aplicativo administrativo. Não cria cópia de tenant, não muda Loyola de DRAFT para ACTIVE e não altera o checkout público. Configurações em `/painel-de-controle/configuracoes` reutilizam integralmente `Config.tsx`, também servido em `/config` no Gestor.

## Dados e operação

- Pedidos, menu, clientes, campanhas e estoque são as mesmas coleções/linhas usadas no Gestor.
- Financeiro, metas, leads, notas, custos e ocorrências vivem em `control_records`, isolados por empresa e acessíveis apenas a `owner` ativo.
- Salvamento exige revisão otimista. Duas telas que editam a mesma linha não sobrescrevem uma à outra silenciosamente.
- Alterações geram `operation_audit` com operador, antes/depois, revisão e horário. Não há exclusão física dos lançamentos na interface; use estorno.
- Perda de estoque e seu estorno são transações na mesma base: baixa/retorno e auditoria confirmam juntos. Estorno duplicado é recusado.
- Leituras são renovadas a cada 15 segundos com a aba visível e ao voltar à aba. Falhas preservam o último resultado com indicação explícita. Não se apresenta zero como resposta a erro de leitura.
- Sessão, renovação de token, tema, PWA, dados do estabelecimento, login e ADM Landing são os recursos existentes do Gestor.

## Definições financeiras

Venda registrada não significa repasse recebido. O saldo confirmado usa saldo inicial + contas a receber liquidadas − despesas pagas − contas a pagar liquidadas. A projeção acrescenta os compromissos abertos com vencimento até a data escolhida, incluindo os atrasados. Não projeta vendas futuras presumidas.

Registrar uma compra como despesa e novamente como conta paga duplica sua saída; mantenha uma única representação. O saldo inicial deve refletir a posição anterior aos movimentos lançados. Não é extrato bancário nem contabilidade fiscal.

A contribuição de produto usa vendas válidas e custo variável unitário informado manualmente. Descontos de pedido são rateados pelo valor dos itens; taxa de entrega não integra a receita do produto. O custo é uma estimativa atual, não um custo histórico congelado. O sistema não afirma lucro líquido quando despesas e custos completos não estão disponíveis.

Não foram conectados bancos, adquirentes nem mensageria. Conciliação e respostas/retornos são registros internos. Primeira compra e recompra vêm dos pedidos válidos pelo telefone. Promoção atribuída não prova causalidade. Tempos médios, prazo e pontualidade não são inventados quando faltam marcos operacionais.

## Download do código completo

As duas páginas de configurações usam `SourceCodeDownload`. O build administrativo gera `/downloads/source-code.enc` (ZIP completo criptografado AES-256-GCM) e um manifesto de integridade. O ZIP inclui `src`, `public`, `supabase`, `pocketbase`, `scripts`, `docs`, `deploy`, `tests` e configuração/lockfiles do projeto; não inclui histórico Git, dependências instaladas, builds, dumps, credenciais, `.env` ou dados operacionais.

`SOURCE_EXPORT_KEY` é um segredo de build de 32 bytes em hexadecimal, **sem prefixo VITE_**. A chave correspondente é registrada em `app_private.control_source_keys` por seu SHA-256; o segredo não deve ser inserido no repositório. `control_source_key` verifica `owner` ativo no servidor e audita a autorização antes de liberar a chave. O navegador verifica o manifesto, decripta o ZIP com WebCrypto e inicia o download. Visitantes e funcionários sem perfil proprietário não obtêm a chave, mesmo conhecendo a URL do arquivo criptografado.

Para outra instalação: configure as variáveis públicas VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY e VITE_SUPABASE_TENANT_ID; aplique as migrações em ordem; provisionar o proprietário e a chave do pacote é uma ação administrativa. O código exportado contém estrutura e instruções, não um backup do banco.

## Validação

Testes automatizados cobrem separação venda/caixa, projeção, estorno, custos ausentes, rateio de desconto, validação monetária e exportação criptografada sem segredos. Testes transacionais no banco verificam leitura por proprietário, criação/edição, concorrência, negação a não proprietário, perda/estorno e auditoria, sempre com rollback. A conferência final no navegador com a conta proprietária ainda é necessária para validar a experiência autenticada no aparelho real.
# Visão do proprietário e navegação

A tela inicial reúne faturamento, resultado ainda não apurado, saldo confirmado, recorrência por telefone, gráfico de entradas e saídas, compromissos abertos, operação, clientes e prioridades. A interface respeita o modo claro/escuro do gestor. Sem login, exibe somente a estrutura visual, sem números ou informações privadas.

O menu agrupa as subáreas em Financeiro, Operação, Relacionamento e Controle. Visão geral e Precisa da sua atenção permanecem acessíveis diretamente. Registro de despesas tem sua própria subárea financeira; não existe mais botão de nova despesa em todas as telas.

O filtro do cabeçalho se aplica aos pedidos, compradores e gráfico financeiro. Saldos e compromissos em aberto continuam considerando o histórico completo, conforme seus rótulos. O gráfico considera somente recebíveis, despesas e contas a pagar confirmados, pela data informada no lançamento; saldo inicial e vendas não são tratados como entrada recebida. A tabela do gráfico permite conferir os valores exatos por data. No histórico completo, os pontos são agrupados por mês.

Clientes recorrentes são compradores identificados pelo telefone com segunda compra válida até o período selecionado. Pedidos cancelados/recusados e compradores sem telefone não compõem a taxa. Resultado líquido, tempo médio de preparo e satisfação permanecem sem apuração quando faltam fontes. A calculadora de precificação fica no cabeçalho do Gestor, ao lado dos atalhos existentes, e não modifica os preços automaticamente.

## Calculadora de preço e lucro

O ícone Calculadora no cabeçalho do Gestor abre um diálogo carregado sob demanda. O produto e o preço podem vir do cardápio já carregado. Trocar o produto limpa os custos anteriores. A simulação pode usar custo agregado de ingredientes ou ficha de compra/receita, com quantidade comprada e utilizada na mesma unidade e aproveitamento percentual aplicado uma única vez.

A receita base é o preço menos o desconto da loja (em reais ou percentual). Impostos, pagamento e comissão incidem sobre essa receita, com cada taxa arredondada individualmente em centavos. A contribuição subtrai custos variáveis e taxas; o resultado estimado subtrai a parcela de despesa fixa informada. Sem essa parcela, não se afirma lucro nem se sugere preço. A meta é margem sobre a receita após desconto, não markup sobre o custo. O preço sugerido é verificado após arredondamento; metas inviáveis são indicadas.

O rateio é uma hipótese manual; o canal identifica a simulação e não aplica taxas presumidas. Campos opcionais vazios são zero e precisam ser conferidos pelo operador. Contratos com outra base de cobrança e descontos financiados por terceiros exigem tratamento próprio. O subsídio de entrega deve conter somente o custo atribuído à unidade, sem duplicar taxas ou embalagens.

A calculadora não grava custos no banco, não altera cardápio e não faz lançamentos financeiros. O rascunho permanece somente enquanto a tela do Gestor estiver montada; fechar e reabrir o diálogo preserva os valores, mas recarregar ou sair do Gestor limpa a simulação. O resumo pode ser copiado explicitamente. A proteção e os fluxos de pedidos existentes permanecem intactos.
