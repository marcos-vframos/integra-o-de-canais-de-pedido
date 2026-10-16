// This route is public only for ONLINE guest checkout. Counter sales require staff auth.
routerAdd('POST','/backend/v1/orders/finalize',(e)=>{
  // PocketBase serializes route handlers in isolated VM contexts; shared helpers
  // must be required inside the handler, not referenced as top-level declarations.
  const { cents, money, normalized, digits, findItem, stockByNameOrCode,
    setting, inventoryCode, breadKind, insidePolygon, deliveryRegion,
    extraPrice, prepareItems, getCampaignDiscount } = require(__hooks + '/order_engine.js')
  const body=e.requestInfo().body||{}
  const origin=body.origin==='balcao'?'balcao':'online'
  if(origin==='balcao' && !e.hasSuperuserAuth() &&
    (!e.auth || e.auth.collection().name!=='users'))return e.json(403,{error:'Acesso restrito ao Gestor'})
  if(origin==='online'){
    if(!String(body.customerName||'').trim() || digits(body.customerPhone).length<10)
      return e.json(400,{error:'Informe nome e telefone válidos'})
    if(body.deliveryType==='entrega'&&!String(body.customerAddress||'').trim())
      return e.json(400,{error:'Endereço obrigatório para entrega'})
  }
  const requestId=String(body.clientRequestId||'')
  if(requestId && !/^[a-zA-Z0-9-]{18,80}$/.test(requestId))
    return e.json(400,{error:'Identificador de pedido inválido'})
  let response=null
  try {
    $app.runInTransaction(db=>{
      if(requestId){
        try{
          const older=db.findFirstRecordByData('orders','clientRequestId',requestId)
          response={order:older};return
        }catch(_){}
      }
      if(origin==='online'){
        const manualClosed=setting(db,'force_closed')
        const manualOpen=setting(db,'force_open')
        const open=setting(db,'is_open')
        if(manualClosed && manualClosed.getString('value')==='true')throw new Error('Loja fechada')
        if(!manualOpen || manualOpen.getString('value')!=='true'){
          if(open && open.getString('value')!=='true')throw new Error('Loja fechada')
        }
      }
      const validated=prepareItems(db,body.items)
      let region={fee:0,region:''}
      if(origin==='online')region=deliveryRegion(db,body)
      else region.fee=Math.max(0,cents(body.deliveryFee))
      const voucher=origin==='online'
        ? getCampaignDiscount(db,body,validated.subtotal,region.fee,validated.items)
        : {discount:Math.max(0,Math.min(validated.subtotal,cents(body.discount))),fee:region.fee,campaign:null}
      const total=Math.max(0,validated.subtotal-voucher.discount+voucher.fee)
      for(const code of Object.keys(validated.deductions)){
        const rec=findItem(db,'inventory',code)
        if(!rec)throw new Error('Estoque inconsistente')
        if(rec.getFloat('qty')<validated.deductions[code])throw new Error('Estoque insuficiente: '+rec.getString('name'))
      }
      let ticket=setting(db,'ticket_counter')
      if(!ticket){
        ticket=new Record(db.findCollectionByNameOrId('settings'))
        ticket.set('key','ticket_counter')
        ticket.set('value','1')
      }
      const ticketNumber=Math.max(1,parseInt(ticket.getString('value'),10)||1)
      ticket.set('value',String(ticketNumber+1));db.save(ticket)
      const rec=new Record(db.findCollectionByNameOrId('orders'))
      rec.set('ticketNumber',ticketNumber)
      rec.set('items',validated.items)
      rec.set('subtotal',money(validated.subtotal))
      rec.set('discount',money(voucher.discount))
      rec.set('deliveryFee',money(voucher.fee))
      rec.set('deliveryFeeRegion',region.region)
      rec.set('total',money(total))
      rec.set('payment',['Dinheiro','Cartão','Pix'].includes(body.payment)?body.payment:(String(body.payment||'').startsWith('Cartão')?'Cartão':'Dinheiro'))
      rec.set('status',origin==='online'?'pendente':'pedido aberto')
      rec.set('origin',origin)
      if(requestId)rec.set('clientRequestId',requestId)
      rec.set('customerName',String(body.customerName||'').slice(0,120))
      rec.set('customerPhone',String(body.customerPhone||'').slice(0,40))
      if(body.deliveryType)rec.set('deliveryType',body.deliveryType==='entrega'?'entrega':'retirada')
      rec.set('customerAddress',String(body.customerAddress||'').slice(0,350))
      if(body.deliveryLat)rec.set('deliveryLat',Number(body.deliveryLat))
      if(body.deliveryLng)rec.set('deliveryLng',Number(body.deliveryLng))
      if(voucher.campaign)rec.set('campaignId',voucher.campaign.id)
      if(body.paymentDetails)rec.set('paymentDetails',body.paymentDetails)
      rec.set('invoiceRequested',Boolean(body.invoiceRequested))
      rec.set('invoiceDocument',String(body.invoiceDocument||'').replace(/[^0-9]/g,'').slice(0,14))
      rec.set('invoiceStatus',body.invoiceRequested?'pendente_emissao':'nao_solicitada')
      db.save(rec)
      for(const code of Object.keys(validated.deductions)){
        const inv=findItem(db,'inventory',code)
        inv.set('qty',Math.max(0,inv.getFloat('qty')-validated.deductions[code]))
        db.save(inv)
      }
      if(voucher.campaign){
        voucher.campaign.set('used',true)
        voucher.campaign.set('active',false)
        db.save(voucher.campaign)
      }
      // Keep CRM coherent with confirmed orders (server-only, no public customer writes).
      if(origin==='online' && body.customerPhone){
        const rawPhone=String(body.customerPhone).trim()
        let customer=null
        try{customer=db.findFirstRecordByData('customers','phone',rawPhone)}catch(_){}
        if(!customer)try{customer=db.findFirstRecordByData('customers','phone',digits(rawPhone))}catch(_){}
        if(!customer)customer=new Record(db.findCollectionByNameOrId('customers'))
        const isNew=!customer.id
        customer.set('name',String(body.customerName||'Cliente').trim().slice(0,120))
        customer.set('phone',isNew?rawPhone:customer.getString('phone'))
        if(body.customerAddress)customer.set('address',String(body.customerAddress).trim().slice(0,350))
        customer.set('totalOrders',(isNew?0:customer.getInt('totalOrders'))+1)
        customer.set('totalSpent',money(cents(isNew?0:customer.getFloat('totalSpent'))+total))
        customer.set('lastOrderAt',new Date().toISOString())
        let favorites=[]
        try{favorites=JSON.parse(toString(customer.get('favoriteItems')||'[]'))}catch(_){}
        if(!Array.isArray(favorites))favorites=[]
        validated.items.forEach(it=>{if(it.name&&!favorites.includes(it.name))favorites.push(it.name)})
        customer.set('favoriteItems',favorites.slice(-15))
        db.save(customer)
      }
      response={order:rec}
    })
  }catch(err){
    console.warn('Order rejected:',String(err))
    return e.json(400,{error:String(err && err.message || 'Não foi possível registrar pedido')})
  }
  const rec=response.order
  return e.json(200,{
    success:true,
    order:{
      id:rec.id,ticketNumber:rec.getInt('ticketNumber'),
      items:rec.get('items'),subtotal:rec.getFloat('subtotal'),
      discount:rec.getFloat('discount'),deliveryFee:rec.getFloat('deliveryFee'),
      deliveryFeeRegion:rec.getString('deliveryFeeRegion'),total:rec.getFloat('total'),
      payment:rec.getString('payment'),status:rec.getString('status'),
      origin:rec.getString('origin'),customerName:rec.getString('customerName'),
      customerPhone:rec.getString('customerPhone'),customerAddress:rec.getString('customerAddress'),
      invoiceRequested:rec.getBool('invoiceRequested'),invoiceStatus:rec.getString('invoiceStatus'),
      created:rec.getString('created'),
    }
  })
},$apis.bodyLimit(65536))
