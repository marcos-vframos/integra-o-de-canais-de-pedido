routerAdd('POST', '/backend/v1/orders/delete', (e) => {
  const data = e.requestInfo().body
  const orderId = data && data.orderId ? String(data.orderId) : ''
  const restoreStock = data && typeof data.restoreStock === 'boolean' ? data.restoreStock : true

  if (!orderId) {
    return e.json(400, { error: 'ID do pedido não informado' })
  }

  let orderRecord = null
  try {
    orderRecord = $app.findRecordById('orders', orderId)
  } catch (_) {
    return e.json(404, { error: 'Pedido não encontrado' })
  }

  const restoredItems = []

  if (restoreStock) {
    let items = []
    try {
      const raw = orderRecord.get('items')
      if (Array.isArray(raw)) {
        items = raw
      } else if (typeof raw === 'string') {
        items = JSON.parse(raw)
      }
    } catch (_) {
      items = []
    }

    const toRestore = {}

    items.forEach((it) => {
      const qty = Number(it.qty) || 1
      const removedNamesOrKeys = Array.isArray(it.removed) ? it.removed : []
      const addedList = Array.isArray(it.added) ? it.added : []

      if (it.itemId) {
        let menuRec = null
        try {
          menuRec = $app.findRecordById('menu', it.itemId)
        } catch (_) {
          try {
            menuRec = $app.findFirstRecordByData('menu', 'code', it.itemId)
          } catch (_) {}
        }

        if (menuRec) {
          let recipe = []
          try {
            const rawRec = menuRec.get('recipe')
            if (Array.isArray(rawRec)) {
              recipe = rawRec
            } else if (typeof rawRec === 'string') {
              recipe = JSON.parse(rawRec)
            }
          } catch (_) {
            recipe = []
          }

          recipe.forEach((r) => {
            const ingId = r.ingredientId
            const rQty = Number(r.qty) || 0
            if (rQty <= 0) return

            let invRec = null
            try {
              invRec = $app.findFirstRecordByData('inventory', 'code', ingId)
            } catch (_) {
              try {
                invRec = $app.findFirstRecordByData('inventory', 'id', ingId)
              } catch (_) {}
            }

            const invName = invRec ? invRec.getString('name') : ''
            const invCode = invRec ? invRec.getString('code') : ingId
            const isRemoved =
              removedNamesOrKeys.includes(ingId) ||
              removedNamesOrKeys.includes(invCode) ||
              (invName && removedNamesOrKeys.includes(invName))

            if (!isRemoved) {
              toRestore[invCode] = (toRestore[invCode] || 0) + rQty * qty
            }
          })
        }
      }

      addedList.forEach((a) => {
        const aQty = Number(a.qty) || 0
        if (aQty <= 0) return
        const aName = a.name
        let invRec = null
        try {
          invRec = $app.findFirstRecordByData('inventory', 'name', aName)
        } catch (_) {
          try {
            invRec = $app.findFirstRecordByData('inventory', 'code', aName)
          } catch (_) {
            try {
              invRec = $app.findFirstRecordByData('inventory', 'id', aName)
            } catch (_) {}
          }
        }
        if (invRec) {
          const invCode = invRec.getString('code') || invRec.id
          toRestore[invCode] = (toRestore[invCode] || 0) + aQty * qty
        }
      })
    })

    Object.keys(toRestore).forEach((key) => {
      const addQty = Number(toRestore[key]) || 0
      if (addQty <= 0) return

      let invRec = null
      try {
        invRec = $app.findFirstRecordByData('inventory', 'code', key)
      } catch (_) {
        try {
          invRec = $app.findFirstRecordByData('inventory', 'id', key)
        } catch (_) {}
      }

      if (invRec) {
        const currentQty = invRec.getInt('qty')
        const nextQty = currentQty + addQty
        invRec.set('qty', nextQty)
        $app.save(invRec)
        restoredItems.push({
          name: invRec.getString('name'),
          restoredQty: addQty,
          currentQty: nextQty,
        })
      }
    })
  }

  $app.delete(orderRecord)

  return e.json(200, {
    success: true,
    deletedId: orderId,
    ticketNumber: orderRecord.getInt('ticketNumber'),
    restoredItems: restoredItems,
  })
})
