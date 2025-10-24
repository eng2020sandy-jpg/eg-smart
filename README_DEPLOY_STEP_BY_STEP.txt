EG SMART — Netlify + Functions (Step-by-step)
=================================================
This package includes:
- Frontend (index.html, style.css, script.js)
- Netlify Functions (functions/api.js)
- netlify.toml (configured)
- _redirects (SPA routing)

How to deploy (step-by-step):
1) Create a new repository on GitHub (e.g., eg-smart).
2) Push ALL files in this folder to the repo.
3) Go to Netlify → New site from Git → choose the repo.
4) Build settings:
   - Build command: (leave empty)
   - Publish directory: /
5) Deploy. Netlify will host the SPA and Functions at /.netlify/functions/*

Local testing (optional):
- Install 'netlify-cli':  npm i -g netlify-cli
- Run:  netlify dev
- Open: http://localhost:8888

API Endpoints (via Functions):
- POST /.netlify/functions/api  with JSON:
  { "action": "createCard", "data": { "cafe": "Cafe A", "plan": "Basic" } }
  => returns { code: "C-XXXXXX" } (stub)
- POST /.netlify/functions/api  with JSON:
  { "action": "installCafe", "data": { "cafe": { ... } } }
  => returns install message (stub)

Next Steps (production):
- Replace stubs in functions/api.js with real backend logic that talks to your MikroTik/OpenWRT controller securely (SSH/API).
- Never put secrets in client JS. Use environment variables on Netlify (Site Settings → Environment) for API keys.
- Consider moving Functions to a dedicated Node server if you need long-running tasks or direct device access.
