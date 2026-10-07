migrate(
  (app) => {
    // 1. Altera o campo category em menu de 'select' rígido para 'text' (ou adiciona flexibilidade total)
    // No PocketBase v0.23+, mudamos o campo category para text permitindo qualquer categoria criada
    const menuCol = app.findCollectionByNameOrId('menu')
    const catField = menuCol.fields.getByName('category')
    if (catField) {
      menuCol.fields.removeByName('category')
      menuCol.fields.add(new TextField({ name: 'category', required: true }))
      app.save(menuCol)
    }

    // 2. Adiciona campo suggestedRestock em closures se não existir
    const closuresCol = app.findCollectionByNameOrId('closures')
    if (!closuresCol.fields.getByName('shoppingReport')) {
      closuresCol.fields.add(new JSONField({ name: 'shoppingReport' }))
      app.save(closuresCol)
    }

    // 3. Garante que se houver categorias novas já estejam sem travas
    const categoriesCol = app.findCollectionByNameOrId('categories')
    if (categoriesCol && !categoriesCol.fields.getByName('description')) {
      categoriesCol.fields.add(new TextField({ name: 'description' }))
      app.save(categoriesCol)
    }
  },
  (app) => {
    // Revert
  },
)
