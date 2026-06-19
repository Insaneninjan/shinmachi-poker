Signed URL proxy for shinmachi-poker

This small express server issues signed URLs for objects in the private `avatars` bucket using your Supabase service role key. Keep the service role key secret and do not commit it to Git.

Setup

1. Create a .env in /server with the following:

VITE_SUPABASE_URL=https://your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3000

2. Install deps and run

cd server
npm install
npm start

Usage

Client example (browser):

fetch(`http://localhost:3000/signed-url?path=${encodeURIComponent('user_0001.jpg')}`)
.then(r => r.json())
.then(j => { if (j.url) img.src = j.url })

Security notes

- Keep SUPABASE_SERVICE_ROLE_KEY secret; do not put it in client-side env or commit it.
- Consider adding authentication (JWT) to this endpoint if you don't want it open to the world.
