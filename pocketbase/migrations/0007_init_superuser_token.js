migrate(
  (app) => {
    const settingsCol = app.findCollectionByNameOrId('settings')

    // Gera um token aleatório seguro de 32 caracteres hex/alfanumérico
    const token = $security.randomString(32)

    let settingRecord = null
    try {
      settingRecord = app.findFirstRecordByData('settings', 'key', 'superuser_setup_token')
    } catch (_) {
      settingRecord = new Record(settingsCol)
      settingRecord.set('key', 'superuser_setup_token')
    }

    settingRecord.set('value', token)
    app.save(settingRecord)

    console.log('[SUPERUSER_SETUP_TOKEN] ' + token)
  },
  (app) => {
    try {
      const settingRecord = app.findFirstRecordByData('settings', 'key', 'superuser_setup_token')
      app.delete(settingRecord)
    } catch (_) {}
  },
)
