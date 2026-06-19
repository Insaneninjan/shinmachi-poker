Signed-url proxy (optional / recommended)

If you keep the `avatars` bucket private, run the small signed-url proxy included in `server/` and point the frontend to it.

1. Start the proxy server:

cd server
npm install

# create server/.env with these keys:

# VITE_SUPABASE_URL=https://your-project.supabase.co

# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

npm start

2. In the frontend root `.env`, add:

VITE_SIGNED_URL_PROXY=http://localhost:3000

3. Restart the frontend dev server. The app will fetch signed URLs via the proxy.

Security note: keep the service role key secret and never commit it.
