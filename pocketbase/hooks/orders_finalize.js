routerAdd('POST', '/backend/v1/orders/finalize', (e) => {
  const data = e.requestInfo().body
  if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
    return e.json(400, { error: 'Carrinho vazio ou inválido' })
  }

  const origin = data.origin === 'online' ? 'online' : 'balcao'
  if (origin === 'online') {
    let isOpen = true
    try {
      const openRecord = $app.findFirstRecordByData('settings', 'key', 'is_open')
      isOpen = openRecord.getString('value') === 'true'
    } catch (_) {
      isOpen = true
    }
    if (!isOpen) {
      return e.json(400, { error: 'A loja está fechada no momento. Não é possível fazer pedidos.' })
    }
  }

  // 1. Get and increment ticket counter
  let ticketNumber = 1
  let counterRecord = null
  try {
    counterRecord = $app.findFirstRecordByData('settings', 'key', 'ticket_counter')
    ticketNumber = parseInt(counterRecord.getString('value'), 10) || 1
  } catch (_) {
    const settingsCol = $app.findCollectionByNameOrId('settings')
    counterRecord = new Record(settingsCol)
    counterRecord.set('key', 'ticket_counter')
    counterRecord.set('value', '1')
    $app.save(counterRecord)
    ticketNumber = 1
  }

  // Next ticket
  counterRecord.set('value', String(ticketNumber + 1))
  $app.save(counterRecord)

  // 2. Compute order values
  const subtotal = Number(data.subtotal) >= 0 ? Number(data.subtotal) : 0
  const discount = Math.max(0, Number(data.discount) || 0)
  const deliveryFee = Math.max(0, Number(data.deliveryFee) || 0)
  const cappedDiscount = Math.min(discount, subtotal)
  const calculatedTotal = Math.max(0, subtotal - cappedDiscount + deliveryFee)
  const total = Number(data.total) >= 0 ? Number(data.total) : calculatedTotal

  // 3. Create order record
  const ordersCol = $app.findCollectionByNameOrId('orders')
  const order = new Record(ordersCol)
  order.set('ticketNumber', ticketNumber)
  order.set('items', data.items)
  order.set('subtotal', subtotal)
  order.set('discount', cappedDiscount)
  order.set('deliveryFee', deliveryFee)
  order.set('total', total)
  order.set('payment', data.payment || 'Dinheiro')

  // Status: online orders start as 'pendente', balcão starts as 'pedido aberto'
  const initialStatus = origin === 'online' ? 'pendente' : data.status || 'pedido aberto'
  order.set('status', initialStatus)
  order.set('origin', origin)

  if (data.customerName) {
    order.set('customerName', String(data.customerName).trim())
  }
  if (data.customerPhone) {
    order.set('customerPhone', String(data.customerPhone).trim())
  }
  if (data.deliveryType) {
    order.set('deliveryType', data.deliveryType === 'entrega' ? 'entrega' : 'retirada')
  }
  if (data.customerAddress) {
    order.set('customerAddress', String(data.customerAddress).trim())
  }

  $app.save(order)

  // 4. Stock deduction
  const deductions = data.deductions || {}
  const lowStockWarnings = []

  Object.keys(deductions).forEach((targetKey) => {
    const deductQty = Number(deductions[targetKey]) || 0
    if (deductQty <= 0) return

    let invRecord = null
    try {
      invRecord = $app.findFirstRecordByData('inventory', 'code', targetKey)
    } catch (_) {
      try {
        invRecord = $app.findFirstRecordByData('inventory', 'id', targetKey)
      } catch (_) {}
    }

    if (invRecord) {
      const currentQty = invRecord.getInt('qty')
      const minQty = invRecord.getInt('min')
      const nextQty = Math.max(0, currentQty - deductQty)
      invRecord.set('qty', nextQty)
      $app.save(invRecord)

      if (nextQty <= minQty) {
        lowStockWarnings.push(invRecord.getString('name'))
      }
    }
  })

  return e.json(200, {
    success: true,
    order: {
      id: order.id,
      ticketNumber: order.getInt('ticketNumber'),
      items: order.get('items'),
      subtotal: order.getFloat('subtotal'),
      discount: order.getFloat('discount'),
      deliveryFee: order.getFloat('deliveryFee'),
      total: order.getFloat('total'),
      payment: order.getString('payment'),
      status: order.getString('status'),
      origin: order.getString('origin'),
      customerName: order.getString('customerName'),
      customerPhone: order.getString('customerPhone'),
      deliveryType: order.getString('deliveryType'),
      customerAddress: order.getString('customerAddress'),
      created: order.getString('created'),
      createdAt: order.getString('created'),
    },
    lowStockWarnings: lowStockWarnings,
  })
})
