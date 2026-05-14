# Development guide

Practical setup and workflow notes. Pair with [`architecture.md`](./architecture.md) for code layout and [`.cursor/rules/`](../.cursor/rules/) for editor/agent rules.

---

## 1. Environment

1. Copy `.env.example` to `.env.local` at the repo root.
2. Fill the **public Appwrite** variables from your Appwrite Console (Project Settings → Overview):
   - `NEXT_PUBLIC_APPWRITE_ENDPOINT` — usually `https://<region>.cloud.appwrite.io/v1`.
   - `NEXT_PUBLIC_APPWRITE_PROJECT_ID`.
   - `NEXT_PUBLIC_APPWRITE_DATABASE_ID` — defaults to `bloom`.
   - `NEXT_PUBLIC_APPWRITE_CERTIFICATES_BUCKET_ID`, `NEXT_PUBLIC_APPWRITE_DATA_SOURCES_BUCKET_ID`, `NEXT_PUBLIC_APPWRITE_EXPORTS_BUCKET_ID`.
3. Create an Appwrite **server API key** (Project Settings → API Keys) with Tables, Users, Storage, and (if applicable) Messaging scopes. Set `APPWRITE_API_KEY`. **Never commit this value.** It is read only on the server inside Route Handlers (`app/api/*`) via `lib/appwrite/server.ts`.

Table IDs default in `lib/appwrite/config.ts` to: `blooms`, `text_layers`, `data_sources`, `mappings`, `integrations`, `email_drafts`, `send_jobs`, `send_job_rows`. The database ID defaults to `bloom`. Bucket IDs default to `certificates`, `data_sources`, `exports`.

---

## 2. Install and run

```bash
npm install
npm run dev
```

- **Lint:** `npm run lint`
- **Type-check:** `npx tsc --noEmit`
- **Production check:** `npm run build && npm run start`

The dev server runs on `http://localhost:3000` by default. Route Handlers (`app/api/render-certificate`, `app/api/send-queue`, `app/api/smtp-test`) are hit by the corresponding feature services via `fetch`.

---

## 3. Appwrite checklist

Before running the app end-to-end:

- Add a **Web** platform in Appwrite with hostname `localhost` (and your production host when deployed).
- Configure **Google OAuth** per Appwrite documentation if you want OAuth sign-in (magic-link works without it).
- Create the **database** matching `NEXT_PUBLIC_APPWRITE_DATABASE_ID` (default `bloom`).
- Create the **tables** listed in §1 with attributes the services expect (see `features/<name>/services/*-service.ts` for the row schemas).
- Create the **storage buckets** for certificate templates, CSV uploads, and exports.
- Verify CORS / session cookie behavior when testing across devices on the same LAN (use the hostname registered in Appwrite).

If a table is missing or has wrong attributes, the readable error helper in `lib/appwrite/errors.ts` will translate Appwrite's response into a hint about the offending attribute.

---

## 4. Architecture quick map

| Where to put… | Path |
|---------------|------|
| A new page or route | `app/<segment>/page.tsx` (thin — compose feature components) |
| A new Route Handler | `app/api/<route>/route.ts` (validate input, delegate to a feature service) |
| Feature UI | `features/<name>/components/` |
| Domain logic | `features/<name>/services/<name>-service.ts` (class + singleton export) |
| TanStack Query hooks | `features/<name>/hooks/use-<thing>.ts` (call the service) |
| Query keys / table IDs | `features/<name>/constants/{query-keys,appwrite-tables}.ts` |
| Feature types | `features/<name>/types/index.ts` |
| Browser Appwrite client | `lib/appwrite/client.ts` (do not re-instantiate elsewhere) |
| Server (admin) Appwrite client | `lib/appwrite/server.ts` — Route Handlers only |
| Pure helpers (no I/O) | `lib/utils/`, `lib/tokens/` |

Import direction: `lib` → `features` → `app` / `components`. Never the reverse.

---

## 5. Frontend tooling notes

- **TanStack Query** is provided in `app/layout.tsx` via `components/providers.tsx`. Every feature hook is a Query/Mutation that calls a service singleton; do not call services directly from components.
- **Tailwind CSS v4** with PostCSS; styles in `app/globals.css`.
- **Server vs client:** Server Components by default. Add `"use client"` only when the file uses state, browser APIs, or TanStack Query hooks. Never import `lib/appwrite/server.ts` from a client file.

---

## 6. Common gotchas

- **Magic-link callback:** the redirect URL must match an entry in your Appwrite project's allowed callback URLs. Local dev needs `http://localhost:3000/auth/callback`.
- **Session restoration:** `lib/appwrite/client.ts` reads `bloom.appwrite.sessionId` from `localStorage` at module load. If you sign in with one Appwrite project then change env vars, clear localStorage.
- **Route Handler stubs:** `app/api/{render-certificate,send-queue,smtp-test}/route.ts` are currently stubs that echo JSON. Real implementations (PNG rendering, SMTP send, SMTP verify) belong in those files and may use `createAdminClient()` from `lib/appwrite/server.ts`.

---

## 7. Where to read next

| Topic | Document |
|-------|----------|
| Code layout & layer boundaries | [`architecture.md`](./architecture.md) |
| Naming and file placement | [`../.cursor/rules/conventions.mdc`](../.cursor/rules/conventions.mdc) |
| Next.js 16 caveats for agents | [`../AGENTS.md`](../AGENTS.md) |
