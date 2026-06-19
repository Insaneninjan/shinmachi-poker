import { serve } from 'std/server'
import { createClient } from '@supabase/supabase-js'

// DO NOT hardcode keys here. Set the following as secrets in the Supabase dashboard
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
}

const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '')

serve(async (req: Request) => {
  try {
    const url = new URL(req.url)
    // Accept either GET ?path=... or POST { path }
    let path: string | null = url.searchParams.get('path')
    if (!path && req.method === 'POST') {
      const body = await req.json().catch(() => null)
      path = body?.path ?? null
    }
    if (!path) return new Response(JSON.stringify({ error: 'path required' }), { status: 400 })

    const ttl = 3600
    const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, ttl)
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
    return new Response(JSON.stringify({ url: data?.signedUrl }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
