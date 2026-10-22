# Loyola's Lanches - diagnóstico de pré-lançamento

Revisão de 22/10/2026. Escopo: Landing, Loja integrada, Gestor PWA, adaptador Supabase, funções de checkout e rotas, migrações, testes e configuração de publicação. Base: branch feat-supabase-runtime-loyolas-20261019, commit inicial f9fb04e8dc84f5b773c6cf66fd224134415c3881. Não houve promoção para main, ativação da empresa nem venda real nesta revisão.

## 1. Parecer e alcance

**Não liberar para lançamento público neste momento.** Há condições para continuar a homologação e preparar um piloto acompanhado, depois de cumprir os bloqueadores abaixo. O sistema está em DRAFT. Compilar e passar em testes não equivale a comprovar operação comercial completa.

A revisão encontrou falhas reais de integração, confirmação de gravação e carregamento; elas foram corrigidas e verificadas nos níveis descritos. Não é possível garantir ausência absoluta de bugs ou preservar todos os comportamentos sem testes reais dos dispositivos e dos operadores. As regras de preços, adicionais, sabores e promoções permanecem nos testes de regressão. Nenhuma receita ou preço de produto foi alterado por esta auditoria.

| Evidência obtida | Resultado e limite |
| --- | --- |
| Testes automatizados | 63 aprovados; incluem sessão, promoções, bebidas, estoque, vouchers, rotas, paginação, recuperação e fila offline |
| TypeScript | Aplicação e configuração de build sem erros; a checagem agora participa dos builds |
| Lint | Zero erros; 18 avisos restantes, principalmente dependências de hooks e código não utilizado |
| Compilação | Landing e Gestor compilados em produção; módulos administrativos carregados sob demanda |
| SQL no banco | Três roteiros transacionais aprovados: operação/caixa, taxas e promoções; dados fictícios e rollback |
| Isolamento | RLS habilitada em todas as tabelas públicas; RPC operacional verifica usuário, vínculo e tenant |
| Inventário cadastral | 87 produtos ativos, nenhum preço não positivo, nenhuma receita vazia, nenhum saldo negativo; consistência de quantidades reais ainda exige contagem física |
| Taxas | 128 registros ativos sem valor; devem ser precificados ou desativados antes de oferecer essas entregas |
| Não comprovado nesta revisão | E-mail real de recuperação, impressoras físicas, pagamento liquidado, autorização fiscal, restauração de backup e carga simultânea |

O cenário revisado é uma loja. A plataforma SaaS multiempresa, o aplicativo Meu Bichu, AquaVisionPRO e o projeto WhatsApp separado não foram alterados nem certificados.

## 2. Falhas corrigidas e efeito esperado

| Achado confirmado | Correção realizada | Verificação |
| --- | --- | --- |
| NODE_ENV recebia gestao, em vez de produção | Removida a redefinição; Vite determina o modo de produção | Build e inspeção dos arquivos publicados |
| Todo o gestor chegava no primeiro pacote | Separação de rotas por importação dinâmica | Pacotes separados para gestão, configurações, edição e recuperação |
| Listas podiam truncar no limite da API | Paginação de 500 registros com ordenação determinística | Teste recupera 1.001 registros sem truncar |
| Leituras simultâneas iguais duplicavam chamadas | Reutilização apenas das requisições em andamento, por sessão e consulta | Teste demonstra uma chamada para duas leituras concorrentes; a próxima leitura consulta novamente |
| Checkout do balcão não renovava sessão | Finalização usa o mesmo transporte com renovação e uma repetição em 401 | Teste com sessão vencida |
| Reenvio de balcão/offline podia gerar nova venda | Identificador estável por tentativa; duplo envio simultâneo bloqueado; fila conserva o identificador | Testes de fila e transporte; idempotência do banco nos roteiros SQL |
| Fila offline podia falhar e aparentar sucesso | Falha de armazenamento gera erro; o carrinho não é limpo sem confirmação local | Simulação de armazenamento cheio/bloqueado |
| Status, recusa e fechamento estavam bloqueados | RPC operacional autorizada substitui escrita direta; financeiro calculado no servidor | SQL com vínculo válido, ausência de acesso e outro tenant |
| Cancelamento dependia de endpoint antigo | Estorno usa stockDeductions gravado na venda e só ocorre uma vez | SQL verifica saldo e cancelamento repetido |
| Fechamento confiava em valores do navegador | Servidor totaliza vendas, pagamentos, origens e lista de reposição; recusa conferência desatualizada | SQL testa total adulterado, conferência divergente e fechamento repetido |
| Contador era zerado fora de transação | Removida a zeragem no fechamento; numeração segue única e crescente | Regra de checkout e vínculo ao fechamento preservados |
| CRM incluía recusados | Recusados deixam de contar como compras válidas | Teste de métricas |
| Recuperação/verificação ainda chamavam interface antiga | Compatibilidade com token hash e sessão de recuperação Supabase; rotas deixam de redirecionar à demonstração | Tipagem e teste do transporte; e-mail real pendente |
| Dados privados podiam permanecer na árvore após sair | Área protegida remonta quando muda a conta ou retorna à prévia | Revisão de código; conferir troca entre contas em aparelho real |
| Chaves estrangeiras sem índice | Adicionados índices aos cinco relacionamentos apontados pelo advisor | Advisor não aponta mais chaves sem índice |
| Imports mortos e trechos sem uso | Removidos imports sem uso e cálculo de consumo descartado no fechamento | Lint e regressão; módulos legados preservados |

Cancelamento agora preserva o registro da venda com status recusado. Não apaga histórico financeiro. Pedidos anteriores sem consumo registrado e pedidos já fechados exigem ajuste acompanhado, para não inventar estorno de estoque nem alterar um caixa consolidado. Devolução de dinheiro e reemissão de voucher não são executadas automaticamente.

## 3. Desempenho, dependências e riscos residuais

| Medida | Antes | Depois | Interpretação |
| --- | --- | --- | --- |
| JavaScript inicial do Gestor | 1.060.642 bytes | 397.462 bytes | Aproximadamente 62,5% menor; outros módulos são baixados ao serem utilizados |
| JavaScript inicial da Landing | 627.123 bytes | 502.878 bytes | Aproximadamente 19,8% menor; a loja integrada possui módulo adicional de cerca de 84,5 kB |
| Requisições idênticas concorrentes | Duplicadas | Compartilhadas em andamento | Não há cache de dados antigos após salvar |
| Tipagem | Cinco erros reais no projeto da aplicação | Zero erros nos dois projetos TypeScript | O comando genérico tsc na raiz, sozinho, não examinava a aplicação |

As medidas são de arquivos, não de tempo percebido. Não foi medido Lighthouse nem Core Web Vitals em celulares reais. A Landing ainda apresenta aviso de pacote acima de 500 kB. Imagens externas, rede móvel, vídeos e o mapa podem dominar o carregamento.

Foram atualizados React Router para 7.18.2, PostCSS para 8.5.23 e Vite para 8.1.6, com versões transitivas corrigidas de nanoid, source-map-js, tinypool, browserslist e baseline-browser-mapping. O lockfile é versionado e a instalação de publicação usa pnpm com lock congelado. O CI passa a acompanhar esta branch.

A auditoria final de todas as dependências aponta **zero alertas críticos**, um alto em braces e um moderado em postcss-selector-parser. Ambos estão na cadeia de construção Tailwind/PostCSS. Braces não tinha versão corrigida na consulta; corrigir o parser exige mudança de versão principal. Não foi feita migração ampla de CSS nesta revisão. O navegador recebe arquivos estáticos compilados, e estes parsers não processam texto de visitantes no servidor desta aplicação. Restringir builds a código confiável e revisar essas dependências antes de aceitar templates/CSS de terceiros. Referências [10]-[12].

Continuam necessários: reduzir consultas periódicas de campanhas a cada três segundos e de outras tabelas a cada 12 segundos; o compartilhamento de leituras ajuda, mas não substitui Realtime ou paginação de histórico por período. Hoje relatórios completos ficam em memória. Não há prova de capacidade para 10, 100 ou 1.000 lojas. Índices ainda sem uso não foram excluídos: a loja não tem volume suficiente para justificar isso.

## 4. Bloqueadores e condições de liberação

| Prioridade | Pendência | Condição objetiva para resolver |
| --- | --- | --- |
| P0 | Empresa em DRAFT | Manter assim durante testes; ativar apenas com autorização e evidências de aprovação |
| P0 | 128 taxas pendentes e limites aproximados | Precificar ou desativar regiões; testar endereço exato, zona limítrofe e fora da área |
| P0 | Fiscal não integrado | Validar regime com contador e comprovar emissão por sistema fiscal autorizado, integrado ou externo |
| P0 | Pedidos públicos sem proteção específica comprovada contra abuso | Implementar e testar limite de tentativas no servidor e desafio/verificação quando necessário; CORS não autentica cliente |
| P0 | Backup sem restauração demonstrada | Restaurar banco e mídias em ambiente separado; validar pedidos, estoque e imagens recuperados |
| P0 | Acesso real e recuperação não validados | SMTP, remetente, URLs de retorno e recuperação de operador funcionando em conta controlada |
| P0 | Privacidade e suporte | Aviso de privacidade, contato do fornecedor, política de entrega/cancelamento e canal de direitos do titular publicados |
| P1 | Proteção de senha vazada desativada | Habilitar no provedor se disponível no plano e confirmar; não foi alterada nesta revisão |
| P1 | Conta/histórico/exclusão do consumidor | Continuam indisponíveis até verificação segura de identidade; manter indicação clara e atendimento manual validado |
| P1 | Ajuste de fechamento | Exclusão direta continua bloqueada; definir estorno/ajuste auditado e retirar qualquer expectativa de apagar caixa fechado |
| P1 | Cadastros sem trilha completa | Novo log cobre status, cancelamento e fechamento; alterações de preço, estoque manual e cadastros ainda precisam de histórico completo |
| P1 | Pagamentos | Pix/Cartão no pedido são formas declaradas, não confirmação automática de recebimento; conciliar antes de considerar pago |
| P1 | Rotas e mapas comunitários | Não têm SLA comercial. Provisionar serviço adequado antes de volume público relevante |
| P2 | Trânsito em tempo real | TomTom está preparado, mas sem chave; não prometer tempo com congestionamentos enquanto inativo |

P0 impede abertura pública recomendada. P1 precisa de tratamento explícito para o piloto e não pode ser vendido como recurso já completo. P2 pode ficar para depois somente se a comunicação ao cliente refletir a limitação.

## 5. Roteiro de validação funcional

Executar com produtos e pedidos identificados como teste, em ambiente separado. Para cada linha, guardar data, responsável, aparelho, resultado, identificação do pedido e evidência sem expor dados pessoais. Os testes automáticos acima não substituem esta rodada.

| Cenário | Critério de aceite |
| --- | --- |
| Entrada e sessão | Login por teclado; recarga, duas abas e retorno após inatividade sem perder gravações; logout não deixa dados de outra conta |
| Permissões | Sem login e usuário de outra empresa não consultam pedidos, clientes ou caixa; caixa não recebe permissão de proprietário |
| Edição | Editar produto e campanha por mais de um minuto; salvar, recarregar e conferir em outro aparelho |
| Imagens e stories | Upload nos limites informados, troca de imagens, carrossel e publicação sincronizados; testar arquivo inválido e falha de rede |
| Produtos | Uma compra de cada categoria; adicionais e pão cobrados corretamente; só preparo compatível com o item |
| Bebidas | Dois sabores com quantidades diferentes; cada unidade integral no total, com descrição e baixa do sabor correto |
| Promoções | Brinde aparece a zero na comanda e baixa estoque; testar terça/quarta, virada de horário, encerramento e tentativa fora da oferta |
| Vouchers | Valor/percentual/produto/frete grátis; prazo, limite e repetição; desconto do carrinho igual ao do servidor |
| Frete | Coordenadas exatas, referência de bairro, taxa fixa, regra legada, taxa zero, taxa pendente e ausência de rota |
| Recebimento online | Pedido aparece uma única vez, muda status, recebe entregador correto e imprime descrição completa |
| Cancelamento | Estoque retorna uma vez; repetição não duplica reposição; venda cancelada sai das métricas; cancelamento após caixa requer ajuste |
| Falha e reenvio | Cortar rede antes e após confirmação; repetir com a mesma chave sem duplicar venda ou baixa |
| Fila offline | Armazenamento cheio gera erro; pedido pendente permanece visível e só some após confirmação no servidor |
| Caixa | Balcão e online conciliados; desconto de fechamento; duas tentativas simultâneas; mesmo pedido não entra em dois fechamentos |
| Impressão | Comanda, fechamento e lista de compras na impressora usada pela loja, sem cortes ou quantidades ausentes |
| Fiscal e recebimento | Documento autorizado no emissor e pagamento conciliado; comanda impressa não é nota fiscal |
| Recuperação | Restaurar backup em ambiente separado e repetir consulta de pedidos, estoque, imagens e permissões |
| Compatibilidade | Android/Chrome, iPhone/Safari, desktop, PWA instalada; rede móvel lenta e tela estreita |

Repetir os cenários financeiros com duas contas simultâneas. Não realizar teste de carga nos servidores comunitários de rotas ou mapas. Usar ambiente e provedor apropriados.

## 6. Ordem de execução e critérios de passagem

| Ordem | Ação | Responsável sugerido | Evidência para avançar |
| --- | --- | --- | --- |
| 1 | Congelar versão de teste e registrar configurações sem segredos | Técnico | Commit e builds identificados; procedimento de retorno escrito |
| 2 | Exportar banco, copiar mídias e restaurar fora da loja | Técnico | Restauração funcional; definir perda máxima e tempo de recuperação aceitáveis |
| 3 | Conferir CNPJ, emissão fiscal e licenciamento aplicável | Gestor e contador | Cadastro e documentos válidos; caminho fiscal testado |
| 4 | Escolher domínio, planos e orçamento; configurar SMTP e contas | Gestor e técnico | Contas sob controle do proprietário, MFA nos provedores, limites de gastos e acesso recuperável |
| 5 | Conferir preços, receitas, sabores, estoques físicos, taxas e origem | Gestor | Ficha de conferência aprovada; nenhuma região ofertada com preço pendente |
| 6 | Concluir privacidade, atendimento, proteção contra abuso e matriz de acessos | Gestor e técnico | Links publicados e testes negativos de acesso/abuso aprovados |
| 7 | Executar toda a matriz funcional em aparelhos e impressora reais | Operadores | Evidências de cada cenário e zero falha financeira ou de isolamento |
| 8 | Medir carga em ambiente isolado: 1, 5, 10 e 25 usuários simultâneos | Técnico | Zero perda/duplicação; taxa de erro e latência registradas, sem sobrecarregar terceiros |
| 9 | Aprovar piloto controlado | Gestor | Plano de contingência, suporte e limite operacional definidos; ativação deliberada |
| 10 | Acompanhar um ciclo completo e conciliar diariamente | Gestor e técnico | Sugestão: pelo menos sete dias e dois períodos de pico; a qualidade dos fluxos importa mais que volume bruto |
| 11 | Liberar divulgação pública gradualmente | Proprietário | Pendências P0 encerradas; métricas estáveis; custos e suporte sustentáveis |

Metas propostas, ainda não medidas: zero divergência de valor/estoque por erro de software, zero pedido duplicado, zero acesso entre empresas; confirmação em até cinco segundos no percentil 95 sem incluir interação humana, com o orçamento de rota medido separadamente. Definir limites de erro e capacidade usando os dados do piloto. Não prometer SLA contratual antes dessa medição.

## 7. Cadastros, documentos e registros

| Item | Quando e para quê | Situação a confirmar |
| --- | --- | --- |
| CNPJ, CNAE, inscrição e licenciamento da loja | Operação comercial e fiscal conforme atividade e regime | Não foram verificados documentos do estabelecimento; checar contador e prefeitura de Pindamonhangaba [6]-[7] |
| Emissor fiscal | A SEFAZ-SP informa NFC-e no varejo paulista desde 01/01/2026; confirmar enquadramento e exceções | Credenciamento, certificado/CSC quando exigidos e emissor autorizado; o campo pedir nota não emite documento [6] |
| Fornecedor do SaaS | Ao vender a outras empresas, formalizar atividade, tributação e emissão de NFS-e da assinatura | Separar venda de software da venda de alimento; confirmar com contador |
| Termos comerciais | Identificação do fornecedor, contato, taxas, prazo, cancelamento e confirmação da compra | Publicar informação clara; revisar regras aplicáveis a alimento preparado [8] |
| LGPD | Inventário dos dados, finalidade, base legal, retenção, acesso, descarte e atendimento | Nome/telefone/endereço/localização e CPF fiscal têm finalidades distintas; não pedir consentimento genérico para tudo [5] |
| Contrato SaaS e operadores de dados | Antes de atender outra loja | Loja normalmente decide sobre pedidos; SaaS trata em seu nome, conforme contratos. Definir responsabilidades, suboperadores e resposta a incidente |
| Domínio e contas técnicas | Antes da divulgação | Titularidade do proprietário, renovação e recuperação; GitHub, Vercel, Supabase, SMTP e mapas com permissões mínimas |
| Marca no INPI | Proteção comercial do nome | Pesquisa e pedido são separados do registro do código; custo varia por classe e enquadramento [9] |
| Software no INPI | Prova adicional de autoria/titularidade | Opcional; não é pré-requisito para rodar. Proteção não depende de registro. Programa de computador em si não deve ser confundido com patente [9] |
| Licenças e imagens | Antes de distribuir/comercializar | Conferir uso comercial de bibliotecas, fotos, marcas de bebidas, vídeos e mapas; imagens acessíveis na internet não são automaticamente licenciadas |
| Google Play/Apple | Somente se decidir publicar nas lojas | Esta versão é uma web app/PWA; seu acesso pelo navegador não exige publicação nas lojas |

Não há uma taxa geral de registro de app na ANPD para tornar esta ferramenta utilizável. A obrigação prática é adequar os tratamentos à LGPD e manter atendimento e segurança. Agentes de pequeno porte podem usar registro simplificado; a condição deve ser confirmada, pois há exceções ao tratamento favorecido [5]. Os requisitos fiscais e empresariais precisam de confirmação profissional conforme o regime real da loja.

## 8. Custos e orçamento de operação

Referências públicas consultadas em 22/10/2026. Valores não representam cobrança já contratada nem fatura desta conta. Dólar deve ser convertido pelo câmbio efetivo, tributos e taxas do pagamento. Não foram incluídos honorários de desenvolvimento.

| Item | Referência de custo | Observação |
| --- | --- | --- |
| Vercel Pro | US$20/mês de base | Uso e assentos adicionais podem elevar valor; dois aplicativos não significam duas assinaturas automaticamente. Hobby é para uso pessoal não comercial [1] |
| Supabase Pro | A partir de US$25/mês | Um projeto Micro coberto pelos créditos do plano no cenário básico; compute maior, novos projetos e excedentes são adicionais [2] |
| E-mail transacional | Pode começar gratuito dentro dos limites; referência paga de US$20/mês | Exemplo Resend Pro; configurar SMTP, domínio e entregabilidade, não apenas conta. Cotar plano efetivo [4] |
| Domínio .br | R$40/ano na referência pública | Aproximadamente R$3,33/mês para planejamento; conferir renovação e disponibilidade [3] |
| TomTom Routing | Página anuncia 20 mil consultas mensais gratuitas dessa API | Elegibilidade e excedentes dependem do produto/plano; a chave desta integração ainda não está configurada [4] |
| OSRM/mapa comunitário | Sem contrato pago configurado | Não equivale a serviço ilimitado ou SLA; prever provedor comercial ou servidor dedicado antes de escalar [13] |
| Backup de banco | Backups diários e sete dias de retenção no Pro básico | Imagens do Storage não fazem parte do backup do banco; prever cópia separada e restauração testada [2] |
| Monitoramento e logs | Inicialmente pode usar franquias dos provedores | Histórico maior, ferramentas externas e alertas podem exigir pagamento; orçamento depende de retenção e tráfego |
| Fiscal | Cotação do emissor, certificado quando necessário e suporte contábil | Não há integração fiscal contratada comprovada; pedir custo inicial, mensalidade e preço por documento |
| Recebimento | Taxas de Pix comercial, cartão e antecipação conforme contrato | Não confundir custo da infraestrutura com custo de processar vendas |
| Equipamentos e contingência | Cotação local | Impressora, papel, dispositivo de operação, internet e conexão alternativa |
| Registro de software | Tabela consultada: R$210 por pedido, serviço 730 | Opcional; conferir GRU vigente, assinatura digital e eventual apoio profissional [9] |
| Marca, contabilidade e revisão jurídica | Cotação conforme escopo | Não incluídos nos US$45 de infraestrutura; podem ser custos iniciais e/ou recorrentes |

Cenário básico de planejamento: **US$45/mês + R$40/ano de domínio**, usando Vercel Pro e Supabase Pro e permanecendo nas franquias. Com o exemplo de SMTP pago: **US$65/mês + domínio**. Ainda somar fiscal, transações, mapas excedentes, suporte, equipamentos e tributos. Uma segunda infraestrutura isolada de homologação pode acrescentar compute/projeto; não foi contratada nesta auditoria.

HostGator não é requisito técnico desta arquitetura. Se já houver plano contratado, verificar se será usado para domínio/e-mail antes de pagar por serviços duplicados. Não contratar registro de marca, software ou plano de nuvem como substituto da validação funcional.

## 9. Registros operacionais, contingência e medição

| Registro | Conteúdo mínimo | Situação |
| --- | --- | --- |
| Venda | ID e chave de repetição, canal, itens, sabores, adicionais, brinde, descontos, frete, total e horário | Persistido pelo checkout; comprovação de pagamento é outra etapa |
| Consumo | Código de estoque e quantidade efetiva consumida por linha | stockDeductions permite estorno da venda sem depender da receita atual |
| Alteração operacional | Operador, empresa, pedido, ação e horário | operation_audit criado para status, cancelamento e fechamento; não cobre todo CRUD |
| Caixa | Pedidos vinculados, meios declarados, origens, desconto e total calculado | Conferência no servidor e vínculo closure_id; conciliação bancária/manual ainda necessária |
| Fiscal | Chave, autorização, XML, situação e cancelamento no emissor | Ainda precisa do emissor autorizado e política de guarda definida com contador |
| Backup | Data, versão, banco, mídias, responsável e resultado da restauração | Procedimento de recuperação ainda a demonstrar |
| Incidente e suporte | Sintoma, impacto, dados envolvidos, providência e conclusão | Definir canal e responsável; não registrar senhas, tokens, cartão completo ou localização sem finalidade |
| Privacidade | Operações de tratamento, bases legais, prazos e solicitações dos titulares | Criar registro simplificado quando aplicável e controle de atendimento [5] |
| Versão | Commit, migrações, builds, resultado dos testes e mudança aplicada | Git/CI e histórico de migrações; conferir novamente antes de promover main |

Contingência proposta: se o checkout não confirmar, não cobrar como se a venda estivesse gravada. Se a rede cair, usar apenas a fila de balcão com indicação pendente e o mesmo identificador na sincronização. Se falhar a gravação local, manter o carrinho e registrar a ocorrência. Não concluir fechamento com fila não reconciliada. Se a rota falhar, ajustar destino ou seguir procedimento manual de taxa previamente aprovado; o sistema não inventa distância em linha reta.

Definir com o proprietário a perda máxima aceitável de dados (RPO) e o tempo máximo para retomar (RTO). Backup diário pode perder até aproximadamente um dia de alterações; uma loja pode precisar de uma janela menor. Versionamento do código e restauração do banco são operações diferentes: não desfazer migração apagando dados de vendas. Para retornar o frontend, usar a versão anterior identificada; para dados, testar o procedimento em cópia antes de qualquer restauração real.

No piloto, conciliar diariamente pedidos recebidos, cancelados, concluídos, total vendido, pagamentos recebidos e diferença de estoque. Medir taxa de conclusão, divergências, duplicações, atraso de atualização do gestor, latência de confirmação, tempo previsto versus realizado e custo por pedido. A decisão de ampliar deve vir dessas evidências, não somente do número de acessos.

## 10. Fontes, reprodução e limites

Referências de preço, regras e operação são públicas e foram consultadas nesta revisão. Revalidar no momento da contratação e do lançamento.

[1] Vercel: https://vercel.com/pricing e https://vercel.com/docs/plans/hobby

[2] Supabase: https://supabase.com/pricing e https://supabase.com/docs/guides/platform/backups . O backup do banco não inclui os arquivos de Storage.

[3] Registro.br: https://registro.br/dominio . Referência pública consultada: R$40/ano.

[4] TomTom e SMTP: https://docs.tomtom.com/pricing ; https://resend.com/pricing?product=transactional ; https://www.resend.com/changelog/pay-as-you-go-pricing . Preço de consulta e franquia devem ser confirmados no plano real.

[5] ANPD: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022 e https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-modelo-de-registro-simplificado-de-operacoes-com-dados-pessoais-para-agentes-de-tratamento-de-pequeno-porte-atpp

[6] SEFAZ-SP: https://portal.fazenda.sp.gov.br/servicos/nfce e https://portal.fazenda.sp.gov.br/servicos/nfce/Paginas/perguntas-frequentes.aspx

[7] Prefeitura, emissão de alvará: https://siapegov.pindamonhangaba.sp.gov.br/pmpinda/websis/siapegov/arrecadacao/alvara/index.php ; conferir licenciamento sanitário e demais exigências para a atividade, sem presumir que emissão online comprova regularidade completa.

[8] Comércio eletrônico: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm

[9] INPI: https://www.gov.br/inpi/pt-br/servicos/programas-de-computador/guia-basico ; https://www.gov.br/inpi/pt-br/servicos/marcas/guia-basico ; tabela de custos: https://www.gov.br/inpi/pt-br/servicos/custos-e-pagamento/copy_of_TabeladeRetribuiesINPI_PortariaMDICn110_2025ePortariaINPIn10_2025.pdf , página 16, serviço 730. Registro facultativo: https://www.gov.br/inpi/pt-br/acesso-a-informacao/perguntas-frequentes/programas-de-computador

[10] Dependência braces: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm

[11] Dependência postcss-selector-parser: https://github.com/advisories/GHSA-rj75-hqrm-r3gf

[12] pnpm audit: https://pnpm.io/pt/11.x/cli/audit ; configurações versionadas em pnpm-workspace.yaml.

[13] Rotas e mapas: https://routing.openstreetmap.de/about.html e https://operations.osmfoundation.org/policies/tiles/ . Serviços comunitários não têm garantia contratual de disponibilidade.

Para reproduzir: pnpm install --frozen-lockfile; pnpm run typecheck; pnpm test; pnpm run lint; pnpm run build:cliente; pnpm run build:gestao. Executar os três arquivos de supabase/tests em ambiente isolado e transacional. A auditoria de dependências retorna resultado não limpo enquanto persistirem os dois alertas documentados; eles não foram silenciados.

Não foram realizados teste de invasão independente, certificação fiscal, auditoria jurídica individual, teste de carga de produção, homologação de impressoras ou migração de outras empresas. Proteções de senha vazada, limites de abuso, backups e integrações externas devem ser comprovados antes da liberação. Não há promessa de ferramenta sem bugs nem de capacidade de escala ainda não medida.
