# Limpeza e verificação para testes — 29/10/2026

## Dados

Histórico operacional de demonstração removido: 17 pedidos, 2 fechamentos, 2 clientes e 2 vouchers. Cópia privada anterior à limpeza mantida em app_private.test_reset_archives, sem acesso por anon/authenticated. Auditoria preservada. Cardápio, estoque, configurações, entregador e plano mensal preservados.

Pedidos legados não tinham registro de consumo; nenhum saldo foi inventado nem devolvido a partir das receitas atuais. O pedido criado na conferência pelo navegador foi removido com devolução exata das baixas registradas. Conferência física do estoque permanece necessária.

Histórico final vazio, próxima comanda 0001 e saldo inicial de testes R$ 0. Plano de custos mensais não foi transformado em despesas pagas. Valores estimados dos ingredientes continuam identificados como estimativas.

## Verificações executadas

| Área | Evidência | Resultado |
|---|---|---|
| Landing, personalização e checkout | Navegador: Americano, ovo extra, observação, retirada e Pix em teste | Recebido no servidor por R$ 19, marcado [TESTE], sem QR de cobrança |
| Preços, adicionais e cortesias | SQL transacional e testes JavaScript | Valores canônicos, adicionais fora da receita, cortesias sem cobrança e estoque correspondente |
| Estoque | SQL transacional | Baixas, repetição sem duplicidade, perdas e estornos |
| Caixa | SQL transacional | Fechamento, cancelamento, limites de edição e isolamento |
| Motoboys | SQL transacional | Despacho, substituição, remoção, data de contabilização e vínculo correto |
| Promoções | SQL transacional e JavaScript | Datas, dias/horários, preços, brindes, expiração e repetição |
| Taxas de entrega | SQL transacional e consulta dos cadastros | Taxa pendente bloqueada; zero explícito permitido; origem confirmada |
| CRM e vouchers | SQL transacional | Quantidade e códigos únicos; relacionamento derivado de pedidos |
| Painel do proprietário | SQL transacional | 12 tipos de registro, persistência, revisões, conflitos e acesso exclusivo |
| Sessão e persistência | Testes JavaScript | Renovação, múltiplas abas, falhas de rede e bloqueio a gravações anônimas |
| Landing e contato | Inspeção visual e correção | Abertura manual refletida no texto; WhatsApp segue o telefone exibido; número de comanda sem # duplicado |
| Publicações e código completo | Build da Vercel | Verificar estado READY e manifesto da versão publicada |

As oito baterias SQL revertem suas próprias transações. Não deixam clientes, pedidos ou empresas sintéticas no sistema.

## Correções

- O Gestor com backend real exige login mesmo se a antiga variável de demonstração estiver habilitada.
- Falha de leitura do backend real não introduz automaticamente cardápio ou estoque de exemplo.
- Texto de loja aberta corrigido no cabeçalho e na localização.
- Links de contato passam a usar o telefone efetivamente exibido, inclusive no comprovante.
- Prefixo duplicado no número da comanda removido da confirmação e do comprovante.

## Limites de liberação

- 127 taxas de entrega ainda estão pendentes. Somente bairros com preço cadastrado podem ser testados.
- 37 itens têm saldo zero; não foram abastecidos artificialmente para fazer os testes passarem.
- A loja permanece em TRIAL com marcação de pedidos de teste. ACTIVE não foi habilitado.
- A navegação administrativa autenticada requer a sessão do proprietário; não se substituiu login por autenticação simulada no navegador.
- Impressora física, instalação em cada aparelho, recebimento de e-mails e integrações externas não são comprovados por testes de banco.
- Conciliação bancária, envio automático de mensagens, satisfação externa e alguns tempos operacionais continuam identificados como não integrados ou sem medição; não foram declarados funcionais.

Antes do lançamento, conferir os saldos físicos, preencher taxas necessárias, executar o ensaio no equipamento da loja e reconciliar quaisquer novos pedidos de teste.
