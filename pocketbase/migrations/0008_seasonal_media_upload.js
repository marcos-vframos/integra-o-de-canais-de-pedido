// Upload real campaign media as PocketBase files instead of multi-megabyte base64 JSON.
// Existing images[] URLs and palettes remain compatible.
migrate((app) => {
  const campaigns = app.findCollectionByNameOrId('seasonal_campaigns')
  if (!campaigns.fields.getByName('media')) {
    campaigns.fields.add(new FileField({
      name: 'media',
      maxSelect: 1,
      maxSize: 15728640,
      mimeTypes: ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf'],
    }))
    app.save(campaigns)
  }
}, (app) => {
  // Preserve media and customer-facing campaigns on rollback.
})
