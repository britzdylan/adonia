/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| Feature routes live in start/routes/*.ts and come from the Adonia
| module stubs. This file mounts them.
|
*/

import router from '@adonisjs/core/services/router'
import './routes/auth.js'
import './routes/account.js'

router.get('/', () => {
  return { hello: 'world' }
})
