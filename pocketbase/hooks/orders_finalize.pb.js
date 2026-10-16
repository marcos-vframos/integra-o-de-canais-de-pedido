// PocketBase JSVM hook. All prices, discounts, delivery fees, stock and tickets
// are recomputed and committed in one server transaction. Never trust browser totals.
const cents = (v) => Math.round((Number(v) || 0) * 100)
const money = (n) => Math.round(n) / 100
const normalized = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const digits = (s) => String(s || '').replace(/\D/g, '')

function findItem(db, collection, value) {
  try { return db.findRecordById(collection, String(value)) } catch (_) {}
  try { return db.findFirstRecordByData(collection, 'code', String(value)) } catch (_) {}
  return null
}
function stockByNameOrCode(db, name) {
  try { return db.findFirstRecordByData('inventory', 'name', String(name)) } catch (_) {}
  return findItem(db, 'inventory', name)
}
function setting(db, key) {
  try { return db.findFirstRecordByData('settings', 'key', key) } catch (_) { return null }
}
function inventoryCode(rec) {
  return rec ? (rec.getString('code') || rec.id) : ''
}
function breadKind(code) {
  const n = normalized(code)
  if (n === 'ing-pao-frances') return 'frances'
  if (n === 'ing-pao') return 'hamburguer'
  return ''
}
function insidePolygon(poly, lat, lng) {
  if (!Array.isArray(poly) || poly.length < 3) return false
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (!Array.isArray(poly[i]) || !Array.isArray(poly[j])) continue
    const yi = Number(poly[i][0]), xi = Number(poly[i][1])
    const yj = Number(poly[j][0]), xj = Number(poly[j][1])
    if ((yi > lat) !== (yj > lat) && lng < (xj-xi)*(lat-yi)/((yj-yi)||1e-12)+xi) hit = !hit
  }
  return hit
}
function deliveryRegion(db, body) {
  if (body.deliveryType !== 'entrega') return { fee: 0, region: '' }
  const all = db.findAllRecords('delivery_fees')
  if (!all.length) throw new Error('Nenhuma taxa de entrega cadastrada')
  const lat = Number(body.deliveryLat), lng = Number(body.deliveryLng)
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && lat !== 0 && lng !== 0) {
    for (const f of all) {
      try {
        const meta = JSON.parse(f.getString('description') || '{}')
        if (insidePolygon(meta.polygon, lat, lng)) return { fee: Math.max(0,cents(f.getFloat('fee'))), region: f.getString('name') }
      } catch (_) {}
    }
  }
  const requested = String(body.deliveryFeeRegion || '')
  const match = all.find(f => f.getString('name') === requested)
  if (match) return { fee: Math.max(0,cents(match.getFloat('fee'))), region: requested }
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat && lng) {
    const haversine=(a,b,c,d)=>{
      const rad=Math.PI/180, p1=a*rad,p2=c*rad
      const h=Math.sin((p2-p1)/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin((d-b)*rad/2)**2
      return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))
    }
    let nearest=null, distance=Infinity
    for (const f of all) {
      const y=f.getFloat('lat'),x=f.getFloat('lng')
      if (!y || !x) continue
      const delta=haversine(lat,lng,y,x)
      if(delta<distance){distance=delta;nearest=f}
    }
    if(nearest) return {fee:Math.max(0,cents(nearest.getFloat('fee'))),region:nearest.getString('name')}
  }
  throw new Error('Selecione uma região de entrega cadastrada para confirmar a taxa')
}
function extraPrice(db, inventory) {
  const code=inventoryCode(inventory)
  if(code==='ing-catupiry'||code==='ing-cheddar'){
    const c=code==='ing-catupiry'?'x-catupiry':'x-cheddar'
    const product=findItem(db,'menu',c)
    return product ? Math.max(0,cents(product.getFloat('price'))) : (code==='ing-catupiry'?400:300)
  }
  // Base rule from src/lib/orderCustomization.ts (all other portions R$ 3).
  return 300
}
function prepareItems(db, supplied) {
  const saved=[], use={}
  let subtotal=0, units=0
  if(!Array.isArray(supplied)||!supplied.length||supplied.length>40) throw new Error('Carrinho inválido')
  for(const raw of supplied){
    const product=findItem(db,'menu',raw.itemId)
    if(!product||!product.getBool('active')) throw new Error('Produto indisponível no cardápio')
    const qty=Number(raw.qty)
    if(!Number.isInteger(qty)||qty<1||qty>30) throw new Error('Quantidade inválida')
    units+=qty
    if(units>100)throw new Error('Quantidade acima do permitido')
    const recipe=product.get('recipe')||[]
    const removed=Array.isArray(raw.removed)?raw.removed.slice(0,30).map(normalized):[]
    const additions=Array.isArray(raw.added)?raw.added.slice(0,40):[]
    const declaredBread=raw.breadChoice==='frances'?'frances':'hamburguer'
    const isGourmet=product.getString('category')==='Gourmet'
    const courtesy=isGourmet&&(raw.gourmetFreeChoice==='catupiry'||raw.gourmetFreeChoice==='cheddar')?raw.gourmetFreeChoice:'none'
    let unit=cents(product.getFloat('price')), breadCount=0
    const publicAdd=[]
    const addStock=(code, amount)=>{
      if(!code||amount<=0)return
      use[code]=(use[code]||0)+amount
    }
    for(const ing of recipe){
      const stock=findItem(db,'inventory',ing.ingredientId)
      if(!stock)throw new Error('Ingrediente sem cadastro: '+String(ing.ingredientId).slice(0,30))
      const code=inventoryCode(stock), iq=Number(ing.qty)||0
      if(breadKind(code)){breadCount+=iq;continue}
      const rem=removed.includes(normalized(code))||removed.includes(normalized(stock.getString('name')))
      if(!rem)addStock(code,iq*qty)
    }
    if(breadCount>0){
      const key=declaredBread==='frances'?'ing-pao-frances':'ing-pao'
      const stock=findItem(db,'inventory',key)
      if(!stock)throw new Error('Pão selecionado sem cadastro em estoque')
      addStock(inventoryCode(stock),breadCount*qty)
      if(declaredBread==='frances')unit+=200
    } else if(raw.breadChoice==='frances')throw new Error('Esta receita não admite troca de pão')
    for(const added of additions){
      const count=Number(added.qty)
      if(!Number.isInteger(count)||count<0||count>10)throw new Error('Porção adicional inválida')
      if(!count)continue
      const declaredName=String(added.name||'')
      if(declaredName.includes('(cortesia Gourmet')) {
        if(!isGourmet||courtesy==='none')throw new Error('Cortesia não permitida')
        continue
      }
      const stock=stockByNameOrCode(db,declaredName)
      if(!stock||stock.getString('group')!=='Ingrediente'||breadKind(inventoryCode(stock)))throw new Error('Adicional indisponível')
      const perUnit=extraPrice(db,stock)
      unit+=perUnit*count
      addStock(inventoryCode(stock),count*qty)
      publicAdd.push({name:stock.getString('name'),qty:count,unitPrice:money(perUnit)})
    }
    if(courtesy!=='none'){
      const extra=findItem(db,'inventory',courtesy==='catupiry'?'ing-catupiry':'ing-cheddar')
      if(!extra)throw new Error('Cortesia Gourmet sem ingrediente cadastrado')
      addStock(inventoryCode(extra),qty)
      publicAdd.unshift({name:extra.getString('name')+' (cortesia Gourmet grátis)',qty:1,unitPrice:0})
    }
    subtotal+=unit*qty
    saved.push({
      itemId: product.id, name:product.getString('name'),price:money(unit),
      qty, removed:Array.isArray(raw.removed)?raw.removed.slice(0,30):[],
      added:publicAdd, gourmetFreeChoice:courtesy,
      breadChoice:breadCount?declaredBread:undefined,
      breadSurcharge:breadCount&&declaredBread==='frances'?2:0,
    })
  }
  return {items:saved,subtotal,deductions:use}
}
function getCampaignDiscount(db, body, subtotal, fee, items) {
  if(!body.campaignId) return {discount:0,fee,campaign:null}
  const campaign=findItem(db,'campaigns',body.campaignId)
  if(!campaign||!campaign.getBool('active')||campaign.getBool('used'))throw new Error('Voucher indisponível')
  const expiry=campaign.getString('expiresAt')
  if(expiry && Date.parse(expiry)<Date.now())throw new Error('Voucher expirado')
  const phone=digits(body.customerPhone)
  if(campaign.getString('customerPhone') && digits(campaign.getString('customerPhone'))!==phone)throw new Error('Voucher de outro cliente')
  let discount=0
  const type=campaign.getString('type')
  if(type==='free_delivery')fee=0
  else if(type==='voucher_10'){
    const pct=campaign.getFloat('discountPercent')||10
    discount=Math.round(subtotal*Math.max(0,Math.min(100,pct))/100)
  } else if(type==='product_discount'){
    const productId=campaign.getString('targetProductId')
    const productSubtotal=items.filter(i=>!productId||i.itemId===productId).reduce((s,i)=>s+cents(i.price)*i.qty,0)
    discount=Math.max(0,cents(campaign.getFloat('discountAmount')))
    const pct=campaign.getFloat('discountPercent')
    if(pct>0)discount=Math.round(productSubtotal*Math.min(100,pct)/100)
    discount=Math.min(discount,productSubtotal)
  }
  return {discount:Math.min(Math.max(0,discount),subtotal),fee,campaign}
}

// This route is public only for ONLINE guest checkout. Counter sales require staff auth.
routerAdd('POST','/backend/v1/orders/finalize',(e)=>{
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
