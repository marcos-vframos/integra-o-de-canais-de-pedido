migrate(
  (app) => {
    // 1. menu collection
    const menu = new Collection({
      name: 'menu',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'code', type: 'text' },
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'number', required: true },
        {
          name: 'category',
          type: 'select',
          required: true,
          values: [
            'Carnes',
            'Frango',
            'Hot-Dog',
            'Gourmet',
            'Especial',
            'Combos',
            'Bebidas',
            'Complementos',
          ],
          maxSelect: 1,
        },
        { name: 'active', type: 'bool' },
        { name: 'recipe', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_menu_category ON menu (category)',
        'CREATE INDEX idx_menu_active ON menu (active)',
        'CREATE INDEX idx_menu_code ON menu (code)',
      ],
    })
    app.save(menu)

    // 2. inventory collection
    const inventory = new Collection({
      name: 'inventory',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'code', type: 'text' },
        { name: 'name', type: 'text', required: true },
        {
          name: 'unit',
          type: 'select',
          required: true,
          values: ['un', 'porção', 'fatia', 'rolo', 'g', 'kg', 'ml', 'l'],
          maxSelect: 1,
        },
        { name: 'qty', type: 'number', required: true },
        { name: 'min', type: 'number', required: true },
        {
          name: 'group',
          type: 'select',
          required: true,
          values: ['Ingrediente', 'Operacional'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_inventory_group ON inventory ("group")',
        'CREATE INDEX idx_inventory_qty ON inventory (qty)',
        'CREATE INDEX idx_inventory_code ON inventory (code)',
      ],
    })
    app.save(inventory)

    // 3. orders collection
    const orders = new Collection({
      name: 'orders',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'ticketNumber', type: 'number', required: true },
        { name: 'items', type: 'json', required: true },
        { name: 'subtotal', type: 'number' },
        { name: 'discount', type: 'number' },
        { name: 'deliveryFee', type: 'number' },
        { name: 'total', type: 'number', required: true },
        {
          name: 'payment',
          type: 'select',
          required: true,
          values: ['Dinheiro', 'Pix', 'Cartão'],
          maxSelect: 1,
        },
        { name: 'status', type: 'text' },
        {
          name: 'origin',
          type: 'select',
          values: ['balcao', 'online'],
          maxSelect: 1,
        },
        { name: 'customerName', type: 'text' },
        { name: 'customerPhone', type: 'text' },
        {
          name: 'deliveryType',
          type: 'select',
          values: ['retirada', 'entrega'],
          maxSelect: 1,
        },
        { name: 'customerAddress', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_orders_ticketNumber ON orders (ticketNumber)',
        'CREATE INDEX idx_orders_created ON orders (created DESC)',
        'CREATE INDEX idx_orders_origin ON orders (origin)',
      ],
    })
    app.save(orders)

    // 4. closures collection (com byOriginCount e byOriginTotals incluídos)
    const closures = new Collection({
      name: 'closures',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'openedAt', type: 'date' },
        { name: 'closedAt', type: 'date', required: true },
        { name: 'dateLabel', type: 'text', required: true },
        { name: 'grossTotal', type: 'number', required: true },
        { name: 'discount', type: 'number' },
        { name: 'netTotal', type: 'number', required: true },
        { name: 'byPayment', type: 'json', required: true },
        { name: 'ordersCount', type: 'number', required: true },
        { name: 'productBreakdown', type: 'json', required: true },
        { name: 'byOriginCount', type: 'json' },
        { name: 'byOriginTotals', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_closures_closedAt ON closures (closedAt DESC)'],
    })
    app.save(closures)

    // 5. settings collection
    const settings = new Collection({
      name: 'settings',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'value', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_settings_key ON settings ("key")'],
    })
    app.save(settings)
  },
  (app) => {
    ;['settings', 'closures', 'orders', 'inventory', 'menu'].forEach((name) => {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    })
  },
)
