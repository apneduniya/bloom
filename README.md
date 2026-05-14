# Bloom

**Repository:** `bloom`
**Product surface:** Certificate personalization and email send workspace — upload a PNG template, place merge-tagged text layers, bind CSV data, export per-recipient PNGs, and queue SMTP sends with row-level tracking.

---

## 1. Purpose and scope

Bloom is a **Next.js 16** web application that:

- Lets a signed-in user upload a **certificate PNG template** and personalize it in an in-browser editor with positioned, styled text layers.
- Binds a **CSV data source** to those layers via `{{column}}` merge tags, with live preview and missing-token validation.
- Exports per-recipient PNGs client-side (`features/blooms/services/bloom-png-exporter.ts`).
- Manages a per-user **SMTP integration** (host, port, user, password, from-email) and verifies it.
- Creates **send jobs** that fan out per-row email tasks; each row tracks status (pending / sent / failed) and a generated attachment.

Authentication is via Appwrite magic-link or Google OAuth. All user-scoped data (Blooms, integrations, send jobs) lives in Appwrite Tables with owner-level permissions.

---

## 2. Core capabilities

| Area | Description |
|------|-------------|
| **Auth** | Magic-link + Google OAuth via Appwrite; session restored from `localStorage`. |
| **Editor** | Drag/resize text layers on a canvas overlay, autosave per Bloom; per-layer font, size, color, alignment, opacity, rotation, z-index. |
| **Data binding** | CSV parsing + token engine resolves `{{column}}` against each row; missing-column warnings surface in the editor. |
| **Export** | Client-side `<canvas>` rendering of the template + resolved layers into a downloadable PNG. |
| **Integrations** | One SMTP integration per user, validated via `/api/smtp-test`. |
| **Share / send** | Subject/body/recipient draft per Bloom; send jobs created via `/api/send-queue` with row-range selection. |

---

## 3. Technology stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, custom UI primitives (`components/ui/`) |
| Data fetching (client) | [TanStack Query 5](https://tanstack.com/query) |
| Backend / auth / DB / storage | [Appwrite](https://appwrite.io/) (browser SDK `appwrite` + `node-appwrite` for Route Handlers) |
| Language | TypeScript 5, strict |

---

## 4. Repository layout

High-level map (see [Architecture overview](docs/architecture.md) for full conventions):

| Path | Role |
|------|------|
| `app/` | Routes, layouts, and **Route Handlers** under `app/api/` |
| `features/` | Domain slices: `auth`, `blooms`, `data-sources`, `editor`, `integrations`, `send-jobs`, `share`, `home` — each with `components/`, `hooks/`, `services/`, `constants/`, `types/` |
| `components/` | Route-agnostic UI primitives (`ui/`), shared chrome (`layout/`, `common/`), `providers.tsx` |
| `lib/appwrite/` | SDK clients (`client.ts` browser, `server.ts` admin) + cross-cutting infra (`config`, `permissions`, `errors`, `session`, `tables`) |
| `lib/tokens/`, `lib/utils/` | Pure helpers — no I/O, no feature types |
| `docs/` | Architecture and development guides |
| `.cursor/rules/` | Editor/agent rules (architecture, conventions) |

---

## 5. Quick start

```bash
git clone <this repo>
cd bloom
cp .env.example .env.local   # fill in Appwrite values — see docs/development.md
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Full setup details (Appwrite checklist, env reference, common gotchas): [`docs/development.md`](docs/development.md).

---

## 6. Conventions cheat sheet

- **Services as classes with singleton exports** — `export class XService { ... }; export const xService = new XService();`. Live in `features/<name>/services/`.
- **Hooks call services, components call hooks.** Components never instantiate Appwrite SDKs.
- **Thin routes.** `app/<page>/page.tsx` composes feature components; `app/api/<route>/route.ts` validates input and delegates to a feature service.
- **Server vs client.** Server Components by default; add `"use client"` only for interactivity or browser APIs. Never import `lib/appwrite/server.ts` from a client file.
- **Import direction.** `lib` → `features` → `app` / `components`. Cross-feature imports are allowed when there's genuine composition (e.g. `BloomsService` deletes via `sendJobsService.deleteForBloom`).

---

## 7. Where to read next

| Topic | Document |
|-------|----------|
| Code layout, layers, boundaries | [`docs/architecture.md`](docs/architecture.md) |
| Setup, env, scripts, gotchas | [`docs/development.md`](docs/development.md) |
| Naming and file placement | [`.cursor/rules/conventions.mdc`](.cursor/rules/conventions.mdc) |
| Next.js 16 caveats for agents | [`AGENTS.md`](AGENTS.md) |
