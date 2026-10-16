// Secure previously public PocketBase collection API rules.
// The authenticated staff collection is "users"; public customer operations need
// dedicated scoped endpoints, not unrestricted collection access.
migrate((app) => {
  const staff = '@request.auth.collectionName = "users" && @request.auth.id != ""'
  const rule = (name, list, view, create, update, remove) => {
    const c = app.findCollectionByNameOrId(name)
    c.listRule = list
    c.viewRule = view
    c.createRule = create
    c.updateRule = update
    c.deleteRule = remove
    app.save(c)
  }

  rule('users', 'id = @request.auth.id', 'id = @request.auth.id',
    null, 'id = @request.auth.id', null)

  // Public read; only authenticated staff may change menu and landing content.
  ;['menu','categories','landing_content','seasonal_campaigns','delivery_fees'].forEach(name => {
    rule(name, '', '', staff, staff, staff)
  })

  // Inventory listing is currently used by product customizers; writes restricted.
  rule('inventory', '', '', staff, staff, staff)

  // No public access to private customer profiles or vouchers.
  rule('customers', staff, staff, staff, staff, staff)
  rule('campaigns', staff, staff, staff, staff, staff)

  // Online orders must use the validating server-side endpoint, not direct create.
  rule('orders', staff, staff, null, staff, null)
  rule('closures', staff, staff, staff, staff, staff)
  rule('motoboys', staff, staff, staff, staff, staff)

  const settingsPublic = staff +
    ' || key = "store_name" || key = "is_open" || key = "force_open" || key = "force_closed" || key = "pix_key" || key = "theme"'
  rule('settings', settingsPublic, settingsPublic, staff, staff, staff)

  // Attributes of an order recorded by the checkout flow, never interpreted as tax invoice issuance.
  const orders = app.findCollectionByNameOrId('orders')
  for(const [name,type] of [
    ['deliveryFeeRegion','text'],
    ['clientRequestId','text'],
    ['invoiceDocument','text'],
    ['invoiceStatus','text'],
  ]) {
    if (!orders.fields.getByName(name)) orders.fields.add(type === 'text' ? new TextField({name}) : new JSONField({name}))
  }
  if (!orders.fields.getByName('invoiceRequested')) orders.fields.add(new BoolField({name:'invoiceRequested'}))
  orders.addIndex('idx_orders_request_unique',true,'clientRequestId','clientRequestId != ""')
  app.save(orders)
}, (app) => {
  // For security, do not revert privacy rules or customer protection on rollback.
})
