import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import {
  buildChatMessage,
  defaultChatMessageLimits,
  escapeDiscord,
  escapeSlack,
  isChatProvider,
  isChatWebhookUrl,
} from '#modules/chat/message'
import { ChatDeliveryError, sendChatMessage } from '#modules/chat/send'

const { maxFields, maxValueLength } = defaultChatMessageLimits

const input = {
  title: 'New order on Shop',
  fields: { name: 'Jane', note: 'Hello there' },
  link: { url: 'https://app.test/orders/1', label: 'View order' },
}

test.group('chat isChatWebhookUrl', () => {
  test('accepts the incoming-webhook URLs each provider issues', () => {
    for (const url of [
      'https://hooks.slack.com/services/T000/B000/XXXX',
      'https://hooks.slack.com/workflows/T000/A000/1/abc',
      'https://hooks.slack.com/triggers/T000/1/abc',
    ]) {
      assert.equal(isChatWebhookUrl('slack', url), true, url)
    }
    for (const url of [
      'https://discord.com/api/webhooks/123456/abc-DEF_ghi',
      'https://discordapp.com/api/webhooks/123456/token',
      'https://ptb.discord.com/api/v10/webhooks/123456/token',
      'https://canary.discord.com/api/webhooks/123456/token/',
    ]) {
      assert.equal(isChatWebhookUrl('discord', url), true, url)
    }
  })

  test('refuses other hosts, plain http and the wrong provider', () => {
    for (const [provider, url] of [
      ['slack', 'https://example.com/services/x'],
      ['slack', 'http://hooks.slack.com/services/x'],
      ['slack', 'https://hooks.slack.com.evil.test/services/x'],
      ['discord', 'https://hooks.slack.com/services/T/B/X'],
      ['discord', 'https://discord.com.evil.test/api/webhooks/1/x'],
      ['discord', 'https://discord.com/api/users/1'],
    ] as const) {
      assert.equal(isChatWebhookUrl(provider, url), false, url)
    }
  })

  test('isChatProvider is true for slack and discord only', () => {
    assert.equal(isChatProvider('slack'), true)
    assert.equal(isChatProvider('discord'), true)
    assert.equal(isChatProvider('webhook'), false)
  })
})

test.group('chat buildChatMessage', () => {
  test('builds a Slack text message with the fields and a link', () => {
    assert.deepEqual(buildChatMessage('slack', input), {
      text: [
        '*New order on Shop*',
        '*name*: Jane',
        '*note*: Hello there',
        '<https://app.test/orders/1|View order>',
      ].join('\n'),
    })
  })

  test('builds a Discord message that cannot mention anyone', () => {
    const message = buildChatMessage('discord', input)
    assert.deepEqual(message.allowed_mentions, { parse: [] })
    assert.equal(
      message.content,
      [
        '**New order on Shop**',
        '**name**: Jane',
        '**note**: Hello there',
        'View order: <https://app.test/orders/1>',
      ].join('\n')
    )
  })

  test('escapes Slack control characters in titles and values', () => {
    const text = String(
      buildChatMessage('slack', {
        title: '<!here>',
        fields: { note: '<!channel> see <https://evil.test|bank> & more' },
      }).text
    )
    assert.ok(text.includes('&lt;!channel&gt; see &lt;https://evil.test|bank&gt; &amp; more'))
    assert.ok(!text.includes('<!channel>'))
    assert.ok(!text.includes('<!here>'))
  })

  test('escapes Discord mentions and masked links', () => {
    const content = String(
      buildChatMessage('discord', {
        title: 'x',
        fields: { note: '@everyone [bank](https://evil.test)' },
      }).content
    )
    assert.ok(!content.includes('@everyone'))
    assert.ok(!content.includes('[bank]('))
  })

  test('lists at most maxFields fields and counts the rest', () => {
    const fields = Object.fromEntries(
      Array.from({ length: maxFields + 3 }, (_, i) => [`f${i}`, 'x'])
    )
    const text = String(buildChatMessage('slack', { title: 't', fields }).text)
    assert.ok(text.includes(`*f${maxFields - 1}*: x`))
    assert.ok(!text.includes(`*f${maxFields}*`))
    assert.ok(text.includes('…and 3 more fields'))
  })

  test('cuts long values and keeps Discord under 2,000 characters', () => {
    const long = 'a'.repeat(5000)
    const fields = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`f${i}`, long]))
    const slack = String(buildChatMessage('slack', { title: 't', fields }).text)
    const discord = String(buildChatMessage('discord', { title: 't', fields }).content)
    assert.ok(!slack.includes('a'.repeat(maxValueLength)))
    assert.ok(discord.length <= 2000)
  })

  test('writes non-string values as JSON', () => {
    const text = String(
      buildChatMessage('slack', {
        title: 't',
        fields: { count: 3, agree: true, tags: ['a', 'b'], empty: null },
      }).text
    )
    assert.ok(text.includes('*count*: 3'))
    assert.ok(text.includes('*agree*: true'))
    assert.ok(text.includes('*tags*: ["a","b"]'))
    assert.ok(text.includes('*empty*: '))
  })

  test('escape helpers', () => {
    assert.equal(escapeSlack('a & <b>'), 'a &amp; &lt;b&gt;')
    assert.equal(escapeDiscord('*bold* @here'), '\\*bold\\* @​here')
  })
})

test.group('chat sendChatMessage', () => {
  test('refuses a URL the provider did not issue, before any request', async () => {
    await assert.rejects(
      () => sendChatMessage('slack', 'https://example.com/hook', input),
      (error: unknown) => error instanceof ChatDeliveryError && error.status === null
    )
  })

  test('posts the JSON body and throws with the status on a non-2xx answer', async () => {
    const url = 'https://hooks.slack.com/services/T/B/X'
    const calls: Array<{ url: string; body?: string; type?: string }> = []
    let status = 200
    const send = async (
      target: string,
      request: { body?: string; headers?: Record<string, string> }
    ) => {
      calls.push({ url: target, body: request.body, type: request.headers?.['Content-Type'] })
      return { status, statusText: status === 200 ? 'OK' : 'Not Found' }
    }

    await sendChatMessage('slack', url, input, { send })
    assert.equal(calls[0].url, url)
    assert.equal(calls[0].type, 'application/json')
    assert.deepEqual(JSON.parse(calls[0].body!), buildChatMessage('slack', input))

    status = 404
    await assert.rejects(
      () => sendChatMessage('slack', url, input, { send }),
      (error: unknown) =>
        error instanceof ChatDeliveryError &&
        error.status === 404 &&
        /404 Not Found/.test(error.message)
    )
  })
})
