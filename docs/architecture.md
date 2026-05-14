# Architecture overview

This document summarizes how the **Bloom** codebase is structured.

---

## 1. Design principles

- **Feature slices:** Domain code lives under `features/<name>/` with clear roles: UI in `components/`, orchestration in `services/` (classes), client state in `stores/` when present, shared keys in `constants/`, cross-component types in `types/`.
- **Thin routes:** `app/` pages compose feature components. `app/api/*/route.ts` handlers validate input, then call feature services — they do not contain inlined business logic.
- **Integration isolation:** `lib/` talks to one external system or policy area per module. `lib/` does not import from `features` or `app`.
- **Server vs client:** Server Components and Route Handlers own secrets and authoritative reads. Client Components own interactivity and use TanStack Query to call services. Do not import server-only modules into client files.

Detailed conventions for contributors and automated tooling are in [`.cursor/rules/architecture.mdc`](../.cursor/rules/architecture.mdc) and [`.cursor/rules/conventions.mdc`](../.cursor/rules/conventions.mdc).

---

## 2. Major domains

| Domain | Location | Responsibility |
|--------|----------|------------------|
| **Auth** | `features/auth/` | Magic-link / OAuth sign-in, session awareness hooks |
| **Blooms** | `features/blooms/` | Bloom CRUD, dashboard, upload-create flow |
| **Editor** | `features/editor/` | Certificate editor workspace |
| **Data sources** | `features/data-sources/` | CSV / data source binding for blooms |
| **Integrations** | `features/integrations/` | SMTP configuration and test |
| **Send jobs** | `features/send-jobs/` | Email send orchestration |
| **Share** | `features/share/` | Share workflow (generate + dispatch) |
| **Home / marketing** | `features/home/` | Landing hero, auth CTA, feature bands |

---

## 3. Request flow (simplified)

1. **Browser** loads App Router pages; client features use **TanStack Query** hooks (e.g. `useBlooms`) that call **service singletons** (e.g. `bloomsService`).
2. **Services** in `features/*/services/` use the Appwrite browser SDK via `lib/appwrite/client.ts` (for user-scoped reads/writes) or post to **Route Handlers** under `app/api/*` (for jobs that need server-side execution).
3. **Route Handlers** validate input, then use `lib/appwrite/server.ts` (`node-appwrite` with `APPWRITE_API_KEY`) for admin operations.

---

## 4. Notable integration points

| Integration | Entry points |
|-------------|----------------|
| Appwrite (browser) | `lib/appwrite/client.ts` |
| Appwrite (server, admin) | `lib/appwrite/server.ts` (`createAdminClient()`) |
| Render certificate | `app/api/render-certificate/route.ts` |
| Send queue | `app/api/send-queue/route.ts` |
| SMTP test | `app/api/smtp-test/route.ts` |

---

## 5. Conventions cheat sheet

- Services: `export class XService { ... }; export const xService = new XService();`
- Hooks: `export function useThing()` returning a TanStack Query result; lives in `features/<name>/hooks/`.
- Query keys: `features/<name>/constants/query-keys.ts` exports a factory object (`bloomsQueryKeys.list(userId)`).
- Table IDs: `features/<name>/constants/appwrite-tables.ts`.
- Types: `features/<name>/types/index.ts`.

---

## 6. Related documents

- [`.cursor/rules/architecture.mdc`](../.cursor/rules/architecture.mdc) — full architecture rules (for editors & agents)
- [`.cursor/rules/conventions.mdc`](../.cursor/rules/conventions.mdc) — naming and placement conventions
- [`../AGENTS.md`](../AGENTS.md) — Next.js 16 reality check for code-generating agents
