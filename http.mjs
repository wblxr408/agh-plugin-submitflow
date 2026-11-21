const maxResponseBytes = 2 * 1024 * 1024
const loopback = new Set(['localhost', '127.0.0.1', '[::1]'])

export function api(origin, authHeader, secret) {
  const base = new URL(origin)
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/' ||
      !(base.protocol === 'https:' || (base.protocol === 'http:' && loopback.has(base.hostname)))) {
    throw new Error('Configure an HTTPS origin or an HTTP loopback origin.')
  }
  if (typeof secret !== 'string' || !/^[A-Za-z0-9_.~-]{1,8192}$/.test(secret))
    throw new Error('Provide a valid application credential through AGH secret binding.')
  const auth = authHeader === 'cookie' ? `auth_token=${secret}` : `Bearer ${secret}`
  return async (path, { method = 'GET', body, params } = {}) => {
    const url = new URL(path, base)
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
    let response
    try {
      response = await fetch(url, {
        method,
        headers: { [authHeader]: auth, Accept: 'application/json', ...(body && { 'Content-Type': 'application/json' }) },
        body: body && JSON.stringify(body),
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) throw new Error(`Service returned HTTP ${response.status}.`)
      if (!response.headers.get('content-type')?.includes('application/json'))
        throw new Error('Service did not return JSON.')
      const chunks = []
      let size = 0
      for await (const chunk of response.body) {
        size += chunk.byteLength
        if (size > maxResponseBytes) throw new Error('Service response exceeds 2 MiB.')
        chunks.push(chunk)
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch (error) {
      const baseMessage = response ? `Could not complete the API request (HTTP ${response.status}).` : 'API connection refused, redirected, or timed out.'
      throw new Error(method === 'GET' ? baseMessage : `${baseMessage} Check the service before retrying this operation.`, { cause: error })
    }
  }
}
