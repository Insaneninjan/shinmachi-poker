Supabase Edge Function: getSignedUrl

This directory contains a sample Supabase Edge Function that issues signed URLs for objects in the private `avatars` bucket using the project's service role key.

How it works

- The Edge Function runs in Supabase and has access to the service role key via environment/secret variables.
- The client calls the function (GET ?path=...) to obtain a short-lived signed URL for an avatar.

Files

- functions/getSignedUrl/index.ts — Deno/Edge Function code (uses `@supabase/supabase-js` and `std/server`)

Deployment

1. Install the Supabase CLI and login:

npm install -g supabase
supabase login

2. From the repo root, deploy the function:

supabase functions deploy getSignedUrl --no-verify

3. Add the secret variables in Supabase project settings (or via CLI):

supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
supabase secrets set SUPABASE_URL="https://<project>.supabase.co"

4. Call the function from the client:

// GET
fetch('https://<project>.functions.supabase.co/getSignedUrl?path=user_0001.jpg')
.then(r => r.json())
.then(j => { if (j.url) img.src = j.url })

Security notes

- Do not put the service role key in client-side code. Use Supabase secrets to store service_role key for the function.
- Consider adding authentication (JWT) checks inside the function to restrict who can request signed URLs.
