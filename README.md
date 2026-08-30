# Jarvis AI — Netlify-ready build (OpenRouter / GLM 5.2 free)

Same design, same voice/text chat, same EN/UR switching — powered by OpenRouter's
free GLM 5.2 model, restructured so it actually runs once deployed.

## Why the original file didn't work on Netlify

`jarvis-pro_Ahmad.jsx` called an AI API **directly from the browser with no key**.
That only worked inside Claude.ai's preview, which quietly proxies the request
for you. Anywhere else (Netlify, Vercel, your own server) that call fails
immediately — no auth header, and providers block direct browser calls anyway.

## What changed

- The React component posts to `/api/chat` (same origin, key never exposed to
  the browser).
- A **Netlify Edge Function** (`netlify/edge-functions/chat.js`) holds your real
  `OPENROUTER_API_KEY` server-side and forwards the request to OpenRouter.
- Model is **`z-ai/glm-5.2:free`** — GLM 5.2 on OpenRouter's free tier (rate
  limited, but no cost). Swap models any time via an environment variable, no
  code changes needed.
- Anthropic's/OpenRouter's reply is **streamed** back token-by-token instead of
  waiting for the full answer.
- Everything else — the 3D neural background, orbital logo, voice recognition,
  speech synthesis, EN/UR toggle, light/dark theme, layout — is untouched.

## Deploy to Netlify

1. **Push this folder to a GitHub/GitLab/Bitbucket repo** (or drag-and-drop the
   whole folder into Netlify's "Deploy manually" upload — either works).
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
   Build settings are already set via `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Add your API key** (never commit this to git or paste it into any source
   file): Site settings → Environment variables → add
   - `OPENROUTER_API_KEY` = your key from https://openrouter.ai/keys
   - *(optional)* `OPENROUTER_MODEL` = a different OpenRouter model id if you
     want to switch away from the free GLM 5.2 endpoint
4. Deploy. That's it — no other config needed, Netlify auto-detects the Edge
   Function from `netlify/edge-functions/chat.js` + `netlify.toml`.

## Run locally

```bash
npm install
npm install -g netlify-cli   # once, if you don't have it
cp .env.example .env         # then fill in OPENROUTER_API_KEY (kept out of git by .gitignore)
netlify dev                  # runs Vite + the edge function together
```

(Plain `npm run dev` also works for UI-only iteration, but `/api/chat` calls
will 404 without `netlify dev` running the edge function alongside it.)

## A note on the API key

Your OpenRouter key must live **only** in Netlify's environment variables (or
your local `.env`, which is git-ignored) — never inside `App.jsx` or any file
that ships to the browser or gets pushed to a public repo. Static sites ship
their whole bundle to every visitor, so any key placed in client code is
readable by anyone who opens dev tools. If a key is ever pasted into a chat,
committed, or otherwise exposed, rotate it at https://openrouter.ai/keys.

## Notes

- The free GLM 5.2 tier is rate-limited (currently around 50 requests/day
  per OpenRouter account) — fine for personal use and testing, but consider
  adding OpenRouter credits if you outgrow it.
- Voice input (microphone) requires a real browser tab over HTTPS — Netlify
  serves HTTPS by default, so this works once deployed (it's blocked in
  sandboxed iframe previews, which is expected).
- History is capped at the last 8 turns and replies capped at 320–480 tokens
  to keep responses snappy — adjust `maxTokens` in `App.jsx` or `MAX_HISTORY`
  in the edge function if you want longer replies.
