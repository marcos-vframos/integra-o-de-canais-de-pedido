// Hook que roda no boot do PocketBase
// Se o token ainda existir em settings, imprime nos logs para visualização do administrador
onBootstrap((e) => {
  e.next()
  try {
    const rec = $app.findFirstRecordByData('settings', 'key', 'superuser_setup_token')
    const token = rec.getString('value')
    if (token && token.trim().length > 0) {
      console.log('[SUPERUSER_SETUP_TOKEN] ' + token.trim())
    }
  } catch (_) {
    // Token já utilizado ou inexistente
  }
})

// Endpoint GET /backend/v1/setup-superuser?token=...&email=...&senha=...
routerAdd('GET', '/backend/v1/setup-superuser', (e) => {
  const query = e.requestInfo().query || {}
  const token = (query.token || '').trim()
  const email = (query.email || '').trim().toLowerCase()
  const senha = query.senha || ''

  if (!token) {
    return e.json(400, { error: 'Token de configuração não informado.' })
  }

  // Validação do token salvo no settings
  let settingRecord = null
  try {
    settingRecord = $app.findFirstRecordByData('settings', 'key', 'superuser_setup_token')
  } catch (_) {
    return e.json(403, { error: 'Token de configuração inválido ou já utilizado.' })
  }

  const validToken = settingRecord.getString('value')
  if (!validToken || validToken !== token) {
    return e.json(403, { error: 'Token de configuração incorreto ou já expirado.' })
  }

  // Validação de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    return e.json(400, { error: 'Email inválido. Informe um email válido no parâmetro email.' })
  }

  // Validação de senha
  if (!senha || senha.length < 8) {
    return e.json(400, { error: 'Senha inválida. A senha deve ter no mínimo 8 caracteres.' })
  }

  try {
    const superusersCol = $app.findCollectionByNameOrId('_superusers')

    let superuser = null
    try {
      superuser = $app.findAuthRecordByEmail('_superusers', email)
    } catch (_) {
      superuser = new Record(superusersCol)
    }

    superuser.setEmail(email)
    superuser.setPassword(senha)
    $app.save(superuser)

    // Invalida o token de uso único deletando o registro de settings
    try {
      $app.delete(settingRecord)
    } catch (delErr) {
      // Se falhar a exclusão, esvazia o valor do token
      settingRecord.set('value', '')
      $app.save(settingRecord)
    }

    console.log('[SUPERUSER_SETUP] Superuser configurado com sucesso para: ' + email)

    return e.json(200, {
      success: true,
      message: 'Superuser configurado com sucesso! O token de uso único foi invalidado.',
      email: email,
      dashboardUrl: '/_/',
    })
  } catch (err) {
    console.error('[SUPERUSER_SETUP_ERROR]', err)
    return e.json(500, {
      error: 'Falha interna ao criar/atualizar superuser: ' + (err.message || String(err)),
    })
  }
})
