/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| Feature routes are the module stubs. This file mounts them.
|
*/

import router from '@adonisjs/core/services/router'
import '#modules/auth/stubs/routes/auth'
import '#modules/account/stubs/routes/account'

router.get('/', () => {
  return { hello: 'world' }
})
