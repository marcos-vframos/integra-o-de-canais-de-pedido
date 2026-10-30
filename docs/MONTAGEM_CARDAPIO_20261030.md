# Montagem e imagens do cardápio

Ordem aprovada em 30/10/2026, da base para o topo:

1. Pão sem gergelim e molhos na face interna.
2. Proteína/ingrediente principal da receita.
3. Ovo, quando cadastrado.
4. Cheddar e Catupiry, quando presentes.
5. Presunto, quando cadastrado.
6. Calabresa e bacon, quando presentes.
7. Mussarela.
8. Vinagrete, milho, cebola, tomate, alface e batata palha, conforme a receita.
9. Molhos na face interna do topo e pão sem gergelim.

As camadas ausentes são omitidas. O Max contém três carnes padrão; o Carijó usa frango desfiado. Filé, contra-filé, carne gourmet, linguiça, salsicha e brócolis têm representações distintas. Pão com linguiça segue sua composição: duas linguiças, mussarela, maionese da casa, vinagrete e salada; não recebe automaticamente os molhos ou ingredientes de outras receitas. A posição visual do vinagrete junto à salada segue o esboço aprovado.

## Aplicação

- 82 imagens individuais de alimentos: 64 lanches, cinco combos e 13 complementos.
- Seis recortes adicionais para a montagem interativa: topo/base sem gergelim, frango desfiado, linguiça, salsicha e brócolis.
- As bebidas mantêm os packshots existentes nesta alteração.
- Fotografias ilustrativas geradas a partir dos ingredientes registrados; não são fotografias feitas no estabelecimento.
- Padrões em `src/lib/generatedCatalogImages.ts`, identificados por código e assinatura exata da receita. Se a receita mudar, a imagem antiga não é reaproveitada automaticamente.
- As fotos enviadas pelo operador e o carrossel existente têm prioridade. O editor permite voltar à imagem da receita e reutilizar fotos anteriores.
- Imagens menores de 384 px para a listagem; maiores de até 960 px para a personalização. WebP com transparência, carregamento sob demanda e sem texto/preço embutido.
- Prévia de montagem segue remoções, adicionais, cortesia e escolha do pão. Molhos são representados nas duas faces sem duplicar a quantidade de estoque.

## Escopo preservado

Nenhuma alteração em preços, receitas do banco, estoque, pedidos, pagamento, permissões ou ativação do piloto de sete dias. As imagens desta versão são publicadas com o código; fotos próprias continuam no armazenamento já usado pelo editor.

## Verificação

`npm run build:cliente` e `npm run build:gestao` executam TypeScript, testes e empacotamento. Os testes verificam cobertura dos alimentos, arquivos WebP e miniaturas, invalidação por mudança de receita e ordem/quantidades da montagem, incluindo Max, adicionais, remoções e receitas especiais.
