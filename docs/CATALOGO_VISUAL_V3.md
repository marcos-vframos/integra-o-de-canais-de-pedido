# Catálogo visual — pão quadrado e vegetais em cubos

As imagens padrão dos 69 lanches e combos usam pão de hambúrguer quadrado, sem gergelim, tomate em cubinhos e cebola branca em cubinhos conforme a receita de cada produto. Os 13 adicionais isolados conservam suas imagens específicas. As imagens são ilustrações geradas; as receitas e os preços continuam sendo os dados do cardápio.

Cada produto tem capa e miniatura próprias. A assinatura da receita continua impedindo que uma receita alterada reutilize silenciosamente a imagem antiga. Fotos enviadas pelo operador têm prioridade. As referências conhecidas das imagens padrão antigas são atualizadas também nos conteúdos e nas galerias salvas, sem substituir os arquivos enviados pelo operador.

As peças do pão (topo/base), tomate e cebola da montagem interativa são arquivos independentes; a remoção do ingrediente continua alterando a composição mostrada. As fotos dos produtos permanecem ilustrativas da receita original.

## Piloto de sete dias

O botão “Ativar READY e iniciar meus 7 dias” abre uma janela de revisão. O proprietário confirma as três verificações e usa “Confirmar e iniciar agora” para começar as 168 horas. Abrir a janela não ativa o piloto. A autorização, a data de início, a expiração e a impossibilidade de estender/reiniciar o prazo são verificadas no servidor. As mudanças visuais não ativam o piloto.

## Construção

Os arquivos WebP e suas miniaturas são entregues junto ao código. O sistema publicado não precisa gerar imagens para atender pedidos. `scripts/encode-catalog-v3.py` apenas codifica as versões de entrega, sem alterar a composição do alimento. Os arquivos de versões anteriores permanecem disponíveis para compatibilidade.
