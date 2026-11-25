import assert from 'node:assert/strict'

const origin = new URL(process.argv[2] ?? 'http://localhost:5173').origin
const unexpectedOrigin = 'https://acadex-check.invalid'
const missingPath = '/api/v1/health-check-missing-route'

async function request(path, options = {}) {
  return fetch(new URL(path, origin), { signal: AbortSignal.timeout(10_000), ...options })
}

async function assertApiError(response, status, code) {
  assert.equal(response.status, status)
  assert.match(response.headers.get('content-type') ?? '', /^application\/json\b/)
  const error = await response.json()
  assert.equal(error.status, status)
  assert.equal(error.code, code)
  assert.ok(error.requestId, 'Los errores de la API deben incluir requestId')
  return error
}

const frontend = await request('/')
assert.equal(frontend.status, 200)
assert.equal(frontend.headers.get('x-content-type-options'), 'nosniff')
assert.equal(frontend.headers.get('x-frame-options'), 'DENY')
assert.equal(frontend.headers.get('cross-origin-opener-policy'), 'same-origin')
assert.match(frontend.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/)
if (origin.startsWith('https:')) {
  assert.match(frontend.headers.get('strict-transport-security') ?? '', /max-age=[1-9]\d*/)
}
await frontend.body?.cancel()

const missing = await request(missingPath, { headers: { Origin: origin } })
assert.equal(missing.headers.get('access-control-allow-origin'), origin)
assert.equal(missing.headers.get('x-content-type-options'), 'nosniff')
assert.equal((await assertApiError(missing, 404, 'ROUTE_NOT_FOUND')).path, missingPath)

const disallowed = await request(missingPath, { headers: { Origin: unexpectedOrigin } })
assert.equal(disallowed.headers.get('access-control-allow-origin'), null)
await disallowed.body?.cancel()

await assertApiError(await request('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'ci-no-existe@unitropico.edu.co', password: 'valor-de-prueba' }),
}), 401, 'INVALID_CREDENTIALS')

await assertApiError(await request('/api/v1/requests', { method: 'POST' }), 401, 'MISSING_TOKEN')

console.log('Cabeceras, CORS, 404 JSON, login inválido y solicitudes sin sesión verificados.')
