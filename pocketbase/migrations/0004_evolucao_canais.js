migrate(
  (app) => {
    // 1. categories (Áreas do cardápio gerenciáveis pelo gestor)
    const categoriesCol = new Collection({
      name: 'categories',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'order', type: 'number' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_categories_order ON categories ("order")'],
    })
    app.save(categoriesCol)

    // Seed default categories matching loyolas existing categories
    const initialCategories = [
      'Carnes',
      'Frango',
      'Hot-Dog',
      'Gourmet',
      'Especial',
      'Combos',
      'Bebidas',
      'Complementos',
    ]
    initialCategories.forEach((catName, idx) => {
      try {
        const r = new Record(categoriesCol)
        r.set('name', catName)
        r.set('order', idx + 1)
        r.set('active', true)
        app.save(r)
      } catch (_) {}
    })

    // 2. motoboys (Gestão e despacho)
    const motoboysCol = new Collection({
      name: 'motoboys',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'phone', type: 'text' },
        { name: 'plate', type: 'text' },
        { name: 'active', type: 'bool' },
        { name: 'feePerDelivery', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_motoboys_active ON motoboys (active)'],
    })
    app.save(motoboysCol)

    // Seed initial motoboy
    try {
      const mb = new Record(motoboysCol)
      mb.set('name', 'Carlos Entrega')
      mb.set('phone', '(12) 99123-4567')
      mb.set('plate', 'BRA-2E19')
      mb.set('active', true)
      mb.set('feePerDelivery', 7)
      app.save(mb)
    } catch (_) {}

    // 3. delivery_fees (Bairros e raios com coordenadas)
    // Araretama coords: lat ~ -22.9238, lng ~ -45.4740
    const deliveryFeesCol = new Collection({
      name: 'delivery_fees',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'fee', type: 'number', required: true },
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_delivery_fees_fee ON delivery_fees (fee)'],
    })
    app.save(deliveryFeesCol)

    // Seed default neighborhood delivery fees for Pindamonhangaba / Araretama
    const initialFees = [
      {
        name: 'Araretama (Local)',
        fee: 4,
        lat: -22.9238,
        lng: -45.474,
        description: 'Bairro de origem',
      },
      {
        name: 'Centro de Pindamonhangaba',
        fee: 8,
        lat: -22.9246,
        lng: -45.4616,
        description: 'Região central',
      },
      { name: 'Santana / Mombaça', fee: 10, lat: -22.908, lng: -45.452, description: 'Zona norte' },
      {
        name: 'Moreira César',
        fee: 14,
        lat: -22.875,
        lng: -45.385,
        description: 'Distrito de Moreira César',
      },
      { name: 'Cidade Nova', fee: 7, lat: -22.935, lng: -45.48, description: 'Bairro vizinho' },
    ]
    initialFees.forEach((feeItem) => {
      try {
        const r = new Record(deliveryFeesCol)
        r.set('name', feeItem.name)
        r.set('fee', feeItem.fee)
        r.set('lat', feeItem.lat)
        r.set('lng', feeItem.lng)
        r.set('description', feeItem.description)
        app.save(r)
      } catch (_) {}
    })

    // 4. customers (Cadastro de clientes na loja e CRM)
    const customersCol = new Collection({
      name: 'customers',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'phone', type: 'text', required: true },
        { name: 'passcode', type: 'text' },
        { name: 'address', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'lastOrderAt', type: 'date' },
        { name: 'totalOrders', type: 'number' },
        { name: 'totalSpent', type: 'number' },
        { name: 'favoriteItems', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_customers_phone ON customers (phone)'],
    })
    app.save(customersCol)

    // 5. campaigns (CRM Vouchers gerados pelo gestor para clientes)
    const campaignsCol = new Collection({
      name: 'campaigns',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'customerId', type: 'text' },
        { name: 'customerPhone', type: 'text' },
        { name: 'customerName', type: 'text' },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['voucher_10', 'free_delivery', 'product_discount'],
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'discountPercent', type: 'number' },
        { name: 'discountAmount', type: 'number' },
        { name: 'targetProductId', type: 'text' },
        { name: 'targetProductName', type: 'text' },
        { name: 'active', type: 'bool' },
        { name: 'used', type: 'bool' },
        { name: 'expiresAt', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_campaigns_customerPhone ON campaigns (customerPhone)',
        'CREATE INDEX idx_campaigns_active ON campaigns (active)',
      ],
    })
    app.save(campaignsCol)

    // 6. seasonal_campaigns (Campanhas sazonais: Semana do Açaí, Terça Maluca, etc.)
    const seasonalCol = new Collection({
      name: 'seasonal_campaigns',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'badge', type: 'text' },
        { name: 'description', type: 'text' },
        { name: 'active', type: 'bool' },
        { name: 'startDate', type: 'date' },
        { name: 'endDate', type: 'date' },
        { name: 'ctaText', type: 'text' },
        { name: 'ctaUrl', type: 'text' },
        { name: 'palette', type: 'json' },
        { name: 'images', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_seasonal_active ON seasonal_campaigns (active)'],
    })
    app.save(seasonalCol)

    // Seed default seasonal campaign example
    try {
      const s = new Record(seasonalCol)
      s.set('title', 'Semana do Lanche em Dobro')
      s.set('badge', 'PROMOÇÃO DA SEMANA')
      s.set(
        'description',
        'Na compra de qualquer X-Contra-Filé ou X-Tudo, ganhe 1 porção de batata palha artesanal e molho em dobro da casa!',
      )
      s.set('active', true)
      s.set('ctaText', 'Aproveitar na Loja')
      s.set('ctaUrl', '/loja')
      s.set('palette', {
        bgPrimary: '#1a0909',
        bgSecondary: '#240f0f',
        bgCard: '#331515',
        accentVinho: '#e10600',
        accentVinhoHover: '#b91c1c',
        accentSilver: '#fca5a5',
      })
      s.set('images', [
        'https://img.usecurling.com/p/800/600?q=juicy+cheeseburger+bacon',
        'https://img.usecurling.com/p/800/600?q=french+fries+cheese+bacon',
      ])
      app.save(s)
    } catch (_) {}

    // 7. Adicionar campos em orders: motoboyId, motoboyName, deliveryLat, deliveryLng, campaignId, voucherDiscount
    const ordersCol = app.findCollectionByNameOrId('orders')
    if (!ordersCol.fields.getByName('motoboyId')) {
      ordersCol.fields.add(new TextField({ name: 'motoboyId' }))
    }
    if (!ordersCol.fields.getByName('motoboyName')) {
      ordersCol.fields.add(new TextField({ name: 'motoboyName' }))
    }
    if (!ordersCol.fields.getByName('deliveryLat')) {
      ordersCol.fields.add(new NumberField({ name: 'deliveryLat' }))
    }
    if (!ordersCol.fields.getByName('deliveryLng')) {
      ordersCol.fields.add(new NumberField({ name: 'deliveryLng' }))
    }
    if (!ordersCol.fields.getByName('campaignId')) {
      ordersCol.fields.add(new TextField({ name: 'campaignId' }))
    }
    if (!ordersCol.fields.getByName('paymentDetails')) {
      ordersCol.fields.add(new JSONField({ name: 'paymentDetails' }))
    }
    app.save(ordersCol)
  },
  (app) => {
    ;[
      'categories',
      'motoboys',
      'delivery_fees',
      'customers',
      'campaigns',
      'seasonal_campaigns',
    ].forEach((name) => {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    })
  },
)
