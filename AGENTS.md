<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Architecture

This repo is **feature-sliced**. Before adding or editing code, read:

- [`docs/architecture.md`](docs/architecture.md) — overview, domains, request flow
- [`.cursor/rules/architecture.mdc`](.cursor/rules/architecture.mdc) — layer boundaries and import direction
- [`.cursor/rules/conventions.mdc`](.cursor/rules/conventions.mdc) — naming and file placement

Key rules: domain logic lives in `features/<name>/services/` (class + singleton), not in `lib/`. `lib/appwrite/` only contains the SDK clients; `lib/appwrite/server.ts` is for Route Handlers (`app/api/*`) using `node-appwrite`. Hooks (`features/*/hooks/`) call services; components call hooks.
