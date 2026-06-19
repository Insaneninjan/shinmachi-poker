export async function getSignedUrlFromProxy(proxyBase: string, path: string): Promise<string | null> {
  try {
    const url = `${proxyBase.replace(/\/$/, '')}/signed-url?path=${encodeURIComponent(path)}`
    const r = await fetch(url)
    if (!r.ok) {
      console.warn('signed-url proxy returned', r.status)
      return null
    }
    const j = await r.json()
    return j.url ?? j?.signedUrl ?? null
  } catch (e) {
    console.warn('signed-url proxy request failed', e)
    return null
  }
}
