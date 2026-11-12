import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'

const password = 'Passw0rdAA'

/**
 * Guards what the auth/account stubs return over HTTP: no verification
 * token, no Lucid internals, and a success envelope for `data: null`.
 */
test.group('Auth and account HTTP responses', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  async function registerAndLogin(client: any, email: string) {
    const register = await client
      .post('/api/v1/auth/register')
      .json({ email, password, password_confirmation: password })
    const row = await db.from('users').where('email', email).firstOrFail()
    await client.post('/api/v1/auth/activate').json({ token: row.email_verification_token })
    const login = await client.post('/api/v1/auth/login').json({ email, password })
    return { register, login, token: login.body().data.token as string }
  }

  test('register and login do not return the verification token', async ({ client, assert }) => {
    const { register, login } = await registerAndLogin(client, 'a@example.com')

    register.assertStatus(201)
    assert.notProperty(register.body().data, 'emailVerificationToken')
    assert.equal(register.body().data.email, 'a@example.com')

    login.assertStatus(200)
    assert.notProperty(login.body().data.user, 'emailVerificationToken')
  })

  test('GET /user returns the public user, not the Lucid row', async ({ client, assert }) => {
    const { token } = await registerAndLogin(client, 'b@example.com')

    const response = await client.get('/api/v1/user').bearerToken(token)

    response.assertStatus(200)
    const body = JSON.stringify(response.body())
    assert.notInclude(body, '$attributes')
    assert.notInclude(body, '$scrypt')
    assert.notProperty(response.body().data, 'password')
    assert.notProperty(response.body().data, 'emailVerificationToken')
    assert.equal(response.body().data.email, 'b@example.com')
  })

  test('email change does not return the confirmation token', async ({ client, assert }) => {
    const { token } = await registerAndLogin(client, 'c@example.com')

    const response = await client
      .post('/api/v1/account/email')
      .bearerToken(token)
      .json({ email: 'c2@example.com' })

    response.assertStatus(200)
    assert.equal(response.body().data.pendingEmail, 'c2@example.com')
    assert.notProperty(response.body().data, 'emailVerificationToken')
  })

  test('endpoints with no payload answer 200 with data null', async ({ client }) => {
    const { token } = await registerAndLogin(client, 'd@example.com')

    const forgot = await client
      .post('/api/v1/auth/password/forgot')
      .json({ email: 'd@example.com' })
    forgot.assertStatus(200)
    forgot.assertBodyContains({ success: true, data: null })

    const logout = await client.post('/api/v1/auth/logout').bearerToken(token)
    logout.assertStatus(200)
    logout.assertBodyContains({ success: true, data: null })
  })
})
