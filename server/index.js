import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE url or service role key in environment')
  process.exit(1)
}

const sup = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { realtime: { transport: ws } })

app.get('/signed-url', async (req, res) => {
  const path = req.query.path
  if (!path) return res.status(400).json({ error: 'path required' })
  try {
    const { data, error } = await sup.storage.from('avatars').createSignedUrl(String(path), 3600)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ url: data.signedUrl })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
})

// Debug endpoint: list members (name + avatar_path)
app.get('/members-list', async (req, res) => {
  try {
    const { data, error } = await sup.from('members').select('name,avatar_path').order('created_at', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`signed-url proxy running on :${PORT}`))
