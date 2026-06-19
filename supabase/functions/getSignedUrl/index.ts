// Declare Deno for TypeScript static checks in local/dev environment
declare const Deno: {
  env: { get(name: string): string | undefined },
  serve?: (handler: (req: Request) => Response | Promise<Response>) => void
}

// DO NOT hardcode keys here. Set the required secrets (use non-reserved names).
// Preferred secret name for the service role key: SERVICE_ROLE_KEY
// The function will also accept SUPABASE_SERVICE_ROLE_KEY if present (for backwards compat),
// but the Supabase CLI rejects secret names starting with SUPABASE_, so prefer SERVICE_ROLE_KEY.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or service role key in environment. Set SECRET named SERVICE_ROLE_KEY via `supabase secrets set SERVICE_ROLE_KEY="<key>"`')
}

async function signPath(path: string, ttl = 3600) {
  const bucket = 'avatars'
  const endpoint = `${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodeURIComponent(path)}`
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
  }

  console.log('signPath: start', { endpoint, ttl })

  // Try payload key 'expires_in' first, fallback to 'expiresIn' if necessary
  const tryBodies = [ { expires_in: ttl }, { expiresIn: ttl } ]
  for (const body of tryBodies) {
    try {
      // set a timeout for the fetch so the function won't hang indefinitely
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      let res: Response
      try {
        res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal })
      } finally {
        clearTimeout(timeout)
      }
      console.log('signPath: fetch completed', { status: res.status })
      if (!res.ok) {
        // log body for debugging
        const text = await res.text().catch(() => '<no-body>')
        console.warn('signPath: fetch non-ok', { status: res.status, body: text })
        // continue to next try if server returns non-200
        continue
      }
      const json = await res.json().catch(() => null)
      const url = json?.signedUrl ?? json?.signedURL ?? json?.url ?? null
      console.log('signPath: got json', { url: !!url, json })
      if (url) return url
    } catch {
      console.error('signPath: fetch error or aborted for body', body)
      // try next
      continue
    }
  }
  return null
}

export default async function handler(req: Request) {
  try {
    // CORS preflight handling: allow browser requests from localhost during development
    const CORS_HEADERS: Record<string,string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Expose-Headers': 'sb-request-id',
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }
    const url = new URL(req.url)
    // Accept either GET ?path=... or POST { path }
    let path: string | null = url.searchParams.get('path')
    // Quick debug endpoint: ?debug=echo or ?debug=true will return request headers and method
    const debug = url.searchParams.get('debug')
    if (debug === 'echo' || debug === 'true') {
      const headersObj: Record<string,string> = {}
      for (const [k, v] of req.headers) headersObj[k] = v
      return new Response(JSON.stringify({ ok: true, debug: true, method: req.method, path, headers: headersObj }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
    }
    if (!path && req.method === 'POST') {
      const body = await req.json().catch(() => null)
      path = body?.path ?? null
    }
  if (!path) return new Response(JSON.stringify({ error: 'path required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })

    const signed = await signPath(path, 3600)
    if (!signed) return new Response(JSON.stringify({ error: 'failed to create signed url' }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })

    // Normalize: some storage responses may return a path starting with '/object/...' (relative).
    // Convert it to an absolute URL that the client can open directly.
    let outUrl = signed
    if (outUrl.startsWith('/')) {
      // If the returned path already contains '/storage' prefix, just prefix SUPABASE_URL
      if (outUrl.startsWith('/storage')) {
        outUrl = `${SUPABASE_URL}${outUrl}`
      } else {
        // Otherwise assume it's relative to the storage base (e.g. '/object/...')
        outUrl = `${SUPABASE_URL}/storage/v1${outUrl}`
      }
    }

    return new Response(JSON.stringify({ url: outUrl }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
  } catch (e) {
    const CORS_HEADERS: Record<string,string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Expose-Headers': 'sb-request-id',
    }
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
  }
}

// If running on Deno (Edge Functions), ensure the runtime is serving requests by
// registering the handler with Deno.serve. This avoids cases where the function
// is deployed but not registered to receive events (which can cause timeouts).
try {
  if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  // @ts-expect-error - serve may not be typed in local TS environment
  Deno.serve(handler)
    console.log('Deno.serve registered handler')
  }
} catch (e) {
  // If Deno.serve is not available (e.g., during local TS checks), ignore.
  console.warn('Deno.serve registration skipped or failed', String(e))
}
