# WhatsApp e área do cliente

Implementação preparada para a API oficial da Meta. O envio real depende de uma conta WhatsApp Business, número elegível, cobrança e token de usuário de sistema autorizado. Configure em **Gestor → Configurações → WhatsApp: pedidos e aniversários**. Os mesmos controles aparecem no painel de controle. Credenciais ficam no Supabase Vault; nunca no código público ou nas configurações públicas da loja.

## Ativação na Meta

Crie ou escolha o aplicativo Meta com WhatsApp e vincule o número da loja pelo procedimento oficial. Confirme a elegibilidade para migração/coexistência diretamente na conta Meta antes de alterar o WhatsApp Business já usado. Preencha ID do número, WABA, versão Graph API, token e segredo do aplicativo no gestor. Use um token de usuário de sistema com as permissões exigidas para o número e a conta. Não envie os segredos no chat.

Aprove três modelos em pt_BR e preencha seus nomes no gestor:

- **Autenticação**: código de acesso, com botão de copiar código.
- **Utilidade**: nome, número da comanda e status, nesta ordem. Ex.: “Olá {{1}}, seu pedido #{{2}} está com status: {{3}}.”
- **Marketing**: nome, código promocional e prazo, nesta ordem. Ex.: “Feliz aniversário, {{1}}! O Loyola’s Lanches convida você para comemorar com 10% de desconto. Use {{2}}. Válido por {{3}} após o envio.”

Salve desativado para obter URL e token de verificação do webhook. Cadastre-os no aplicativo Meta e assine `messages`. Depois use **Validar e ativar automação**. O servidor valida o token/número e os três modelos aprovados antes de ativar. A conexão efetiva e um envio real ainda precisam ser testados com o número do proprietário. A API da Meta tem cobrança própria; os valores dependem da categoria e da tabela vigente da conta.

## Segurança e fluxos

O código OTP expira em cinco minutos, admite cinco tentativas e é de uso único. Há limite de três solicitações por telefone/hora e intervalo de 60 segundos. A sessão do cliente é independente do login de operador, tem token aleatório com 256 bits, hash no servidor e validade de 30 dias. Sem verificação não há leitura por telefone de histórico/vouchers nem exclusão. Exclusão exige verificação recente, bloqueia pedidos ainda em andamento e anonimiza dados pessoais, preservando registros financeiros.

Aceites de atualizações do pedido e de marketing são separados e desmarcados por padrão. O cliente pode revogá-los no perfil ou enviar SAIR. A fila usa deduplicação e bloqueio concorrente; a mudança de status no banco produz a notificação. Despachar continua usando o vínculo existente com o motoboy, preservando a contabilidade, e é apresentado ao cliente como “enviado”.

O gestor distingue aceito → em preparo → pronto → despacho. Na área do cliente, o acompanhamento consulta o servidor a cada três segundos enquanto a tela está aberta e visível. Isso é atualização automática por consulta, não conexão WebSocket. Pedidos recentes também podem ser acompanhados no navegador que fez a compra, por uma chave de alta entropia; esse acesso mostra apenas número/status, sem dados pessoais.

O agendamento do aniversário usa São Paulo, após 09h; 29/02 é comemorado em 28/02 nos anos sem 29/02. Somente clientes verificados com aceite de marketing recebem. Há no máximo um voucher por telefone/ano, inclusive se o cadastro for recriado. O código é imprevisível, pessoal e de uso único. O voucher é criado inativo; a Meta precisa aceitar o envio para ativá-lo e fixar a expiração em exatamente 72 horas. O resgate pessoal também exige a sessão verificada no servidor e continua usando a transação de fechamento existente.

Timeouts e respostas ambíguas ficam como `uncertain`, sem repetição automática para evitar mensagem/voucher duplicados. Erros 429 conhecidos podem ser tentados novamente, com limite. O painel mostra falhas; a confirmação do envio incerto deve ser feita na Meta. O webhook é validado por HMAC e por ID do número antes de atualizar entregas. Mensagens antigas não são enviadas retroativamente. A confirmação de aceitação pela Meta não garante entrega nem leitura pelo destinatário.

## Publicação e validação

Aplique a migração `customer_whatsapp_automation`, publique `customer-whatsapp` com `verify_jwt=false` (autenticação própria por sessão/segredo de worker ou HMAC) e atualize as origens permitidas das outras funções. A RPC interna é exclusiva de `service_role`; tabelas privadas têm RLS sem políticas públicas. As notificações de pedido acionam o worker após a confirmação da transação; o cron executa uma vez por minuto para aniversários e recuperação de pendências. Não há envio enquanto a conexão estiver desativada. Nenhuma credencial é pré-preenchida e nenhum cliente antigo recebe aceite presumido.

Execute os testes do frontend e `supabase/tests/customer_whatsapp.sql` em transação com rollback. Verifique em dois navegadores a separação entre clientes e entre tenants, repetição/expiração do OTP, revogação do aceite, validade/uso único do voucher, despacho e contabilidade do motoboy. Teste envio e webhook com credenciais reais somente depois de conectar a conta Meta.

Imagens do pão sem gergelim, cebola branca e tomate em cubos e as 30 opções do selo são prévias para aprovação. Nenhuma opção foi aplicada automaticamente ao catálogo.

## Verificação em 03/11/2026

Migração e correções aplicadas no Supabase; testes transacionais concluídos e revertidos, sem mensagens nem registros fictícios persistentes. Os 144 testes da aplicação e os builds de cliente e gestão passaram. Serviços publicados: customer-whatsapp, finalize-order, delivery-routing e google-business-profile. A conta Meta segue desativada até ser conectada e validada pelo proprietário. A entrega real no WhatsApp e os webhooks da Meta permanecem pendentes de teste com as credenciais da loja. O período de sete dias não foi ativado por esta alteração.
