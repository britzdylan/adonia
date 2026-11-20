import { test } from '@japa/runner'
import assert from 'node:assert/strict'
import type { HttpContext } from '@adonisjs/core/http'
import { containsPattern, resolvePage, toPageResult } from '#modules/api/pagination'
import { csvCell, csvDownloadHeaders, toCsv } from '#modules/api/csv'
import { registerScheduleSafely, runBatch } from '#modules/api/batch'
import { preparePaginated } from '#modules/api/envelope'
import ForceJsonResponseMiddleware, {
  acceptsHtml,
  clientAcceptsHtml,
} from '#modules/api/force_json_middleware'

test.group('api pagination', () => {
  test('resolvePage applies defaults and bounds', () => {
    assert.deepEqual(resolvePage(), { page: 1, pageSize: 25 })
    assert.deepEqual(resolvePage({ page: 0, pageSize: 1000 }), { page: 1, pageSize: 100 })
    assert.deepEqual(resolvePage({ page: 2.7, pageSize: 0 }), { page: 2, pageSize: 25 })
    assert.deepEqual(resolvePage({ pageSize: 10 }, { defaultPageSize: 5, maxPageSize: 8 }), {
      page: 1,
      pageSize: 8,
    })
  })

  test('containsPattern escapes LIKE wildcards', () => {
    assert.equal(containsPattern('50%_off\\'), '%50\\%\\_off\\\\%')
  })

  test('toPageResult reads a Lucid-shaped paginator', () => {
    assert.deepEqual(toPageResult({ all: () => [1, 2], total: 9 }), { rows: [1, 2], total: 9 })
  })

  test('preparePaginated builds meta', () => {
    assert.deepEqual(preparePaginated([1, 2], 5, { page: 2, pageSize: 2 }).meta, {
      total: 5,
      page: 2,
      pageSize: 2,
      totalPages: 3,
    })
  })
})

test.group('api csv', () => {
  test('quotes cells and keeps formulas as text', () => {
    assert.equal(csvCell('=SUM(A1)'), `"'=SUM(A1)"`)
    assert.equal(csvCell('-2+3'), `"'-2+3"`)
    assert.equal(csvCell('say "hi"'), '"say ""hi"""')
    assert.equal(csvCell(null), '""')
    assert.equal(csvCell({ a: 1 }), '"{""a"":1}"')
    assert.equal(csvCell(new Date('2026-01-02T03:04:05Z')), '"2026-01-02T03:04:05.000Z"')
  })

  test('toCsv adds a BOM and CRLF line endings', () => {
    assert.equal(
      toCsv([
        ['a', 1],
        ['b', 2],
      ]),
      '\uFEFF"a","1"\r\n"b","2"'
    )
  })

  test('csvDownloadHeaders keeps the file name safe', () => {
    assert.equal(
      csvDownloadHeaders('my "file"\r\n.csv')['Content-Disposition'],
      'attachment; filename="my_file_.csv"'
    )
  })
})

test.group('api batch', () => {
  test('runBatch counts outcomes and continues after a failure', async () => {
    const errors: number[] = []
    const summary = await runBatch(
      [1, 2, 3, 4],
      async (n) => {
        if (n === 2) throw new Error('boom')
        return n === 3 ? 'skipped' : 'done'
      },
      { onError: (n) => errors.push(n) }
    )
    assert.deepEqual(summary, { done: 2, skipped: 1, failed: 1 })
    assert.deepEqual(errors, [2])
  })

  test('registerScheduleSafely reports a failure instead of throwing', async () => {
    const failed: string[] = []
    const ok = await registerScheduleSafely(
      'digest',
      async () => {
        throw new Error('queue down')
      },
      (name) => failed.push(name)
    )
    assert.equal(ok, false)
    assert.deepEqual(failed, ['digest'])
  })
})

test.group('api force json middleware', () => {
  test('acceptsHtml reads browser and script Accept headers', () => {
    assert.equal(acceptsHtml('text/html,application/xhtml+xml,*/*;q=0.8'), true)
    assert.equal(acceptsHtml('*/*'), false)
    assert.equal(acceptsHtml(undefined), false)
    assert.equal(acceptsHtml('text/html;q=0'), false)
  })

  test('forces JSON and keeps the original header', async () => {
    const headers: Record<string, string | undefined> = { accept: 'text/html' }
    const request = { request: { headers }, header: () => undefined }
    let forced: string | undefined
    await new ForceJsonResponseMiddleware().handle(
      { request } as unknown as HttpContext,
      async () => {
        forced = headers.accept
      }
    )
    assert.equal(forced, 'application/json')
    assert.equal(clientAcceptsHtml(request as unknown as HttpContext['request']), true)
  })
})
