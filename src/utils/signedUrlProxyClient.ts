export async function getSignedUrlFromProxy(proxyBase: string, path: string): Promise<string | null> {
  try {
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
    const functionsBase = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL

    // Helper to fetch and return JSON, logging body when non-ok
    async function fetchJson(url: string) {
      const headers: Record<string, string> = {}
      if (anon) {
        headers['apikey'] = anon
        headers['Authorization'] = `Bearer ${anon}`
      }
      const r = await fetch(url, { headers })
      if (!r.ok) {
        const text = await r.text().catch(() => '<no-body>')
        console.warn('signed-url proxy returned non-ok', { url, status: r.status, body: text })
        return null
      }
      return await r.json().catch(() => null)
    }

    // If a dedicated Functions URL env is configured, prefer it
    if (functionsBase) {
      const url = `${functionsBase.replace(/\/$/, '')}/getSignedUrl?path=${encodeURIComponent(path)}`
      const j = await fetchJson(url)
      return j?.url ?? j?.signedUrl ?? null
    }

    // proxyBase may be either a local proxy base (e.g. http://localhost:3000)
    // or someone accidentally set it to the full functions URL (e.g.
    // https://.../functions/v1/getSignedUrl). Handle both.
    let url: string
    const cleaned = proxyBase.replace(/\/$/, '')
    if (cleaned.includes('/functions/v1') || cleaned.includes('/getSignedUrl')) {
      // proxyBase already points to a function endpoint; don't append /signed-url
      url = `${cleaned}?path=${encodeURIComponent(path)}`
    } else {
      url = `${cleaned}/signed-url?path=${encodeURIComponent(path)}`
    }

    const j = await fetchJson(url)
    return j?.url ?? j?.signedUrl ?? null
  } catch (e) {
    console.warn('signed-url proxy request failed', e)
    return null
  }
}
