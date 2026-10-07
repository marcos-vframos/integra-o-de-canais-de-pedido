migrate(
  (app) => {
    // 0006: Restaura as categorias dos itens da coleção menu mapeando pelo código do item
    // Códigos em seeds.ts:
    // c-* -> Carnes
    // f-* -> Frango
    // h-paolinguica -> Especial
    // h-* -> Hot-Dog
    // g-* -> Gourmet
    // e-* -> Especial
    // combo-* -> Combos
    // b-* -> Bebidas
    // x-* -> Complementos

    app
      .db()
      .newQuery(`
      UPDATE menu SET category = 'Carnes' WHERE (category IS NULL OR category = '') AND code LIKE 'c-%';
      UPDATE menu SET category = 'Frango' WHERE (category IS NULL OR category = '') AND code LIKE 'f-%';
      UPDATE menu SET category = 'Especial' WHERE (category IS NULL OR category = '') AND code = 'h-paolinguica';
      UPDATE menu SET category = 'Hot-Dog' WHERE (category IS NULL OR category = '') AND code LIKE 'h-%';
      UPDATE menu SET category = 'Gourmet' WHERE (category IS NULL OR category = '') AND code LIKE 'g-%';
      UPDATE menu SET category = 'Especial' WHERE (category IS NULL OR category = '') AND code LIKE 'e-%';
      UPDATE menu SET category = 'Combos' WHERE (category IS NULL OR category = '') AND code LIKE 'combo-%';
      UPDATE menu SET category = 'Bebidas' WHERE (category IS NULL OR category = '') AND code LIKE 'b-%';
      UPDATE menu SET category = 'Complementos' WHERE (category IS NULL OR category = '') AND code LIKE 'x-%';
      UPDATE menu SET category = 'Outros' WHERE category IS NULL OR category = '';
    `)
      .execute()
  },
  (app) => {
    // Revert opcional
  },
)
