# Edge Functions — Agent Guidelines

## Project Structure

```
supabase/functions/
├── _shared/              # Shared code (underscore = not a standalone function)
├── tests/
│   ├── generate-story/        # Tests for generate-story
│   ├── generate-story-audio/  # Tests for generate-story-audio
│   └── generate-cover-image/  # Tests for generate-cover-image
├── generate-story/       # Function with per-function deno.json
├── generate-story-audio/ # Function with per-function deno.json
├── generate-cover-image/ # Function with per-function deno.json
└── deno.json             # Top-level: dev/test config (local only)
```

- Shared code lives in `_shared/` (underscore prefix = not a standalone function)
- Tests live in `tests/<function-name>/` directory
- Per-function `deno.json` has production imports only (used at deploy time)
- Top-level `deno.json` has dev/test config including `@std/assert` and `@std/testing` (local only)
- Deno resolves `deno.json` by walking up from the file — since tests are in `tests/` (not inside function dirs), they resolve from the top-level config, not per-function configs

## @supabase/server Pattern (migrated July 2026)

All edge functions use `@supabase/server`'s `withSupabase` wrapper:

```typescript
import { withSupabase, type SupabaseContext } from "@supabase/server";

async function handler(req: Request, ctx: SupabaseContext): Promise<Response> {
  // Auth already verified by withSupabase — ctx.userClaims is available
  const userId = ctx.userClaims!.id; // NOT .sub (that's on JWTClaims)
  const supabase = ctx.supabaseAdmin as any; // cast needed without generated types
  // ... business logic
}

export const handleRequest = withSupabase({ auth: "user" }, handler);

if (import.meta.main) {
  Deno.serve(handleRequest);
}
```

## Key Facts

- `UserClaims` type exposes `.id`, not `.sub`. Use `ctx.userClaims!.id`.
- `ctx.supabaseAdmin` is `SupabaseClient<unknown>` — cast with `as any` for table queries.
- `withSupabase` OPTIONS handler returns 204 (not 200).
- `withSupabase` requires `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEYS` env vars.
- `ai` package imports `@vercel/oidc` which calls `os.hostname()` — tests need `--allow-sys`.

## Testing

- Tests import `handleRequest` directly (the wrapped version).
- Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEYS` env vars in tests (can be dummy values).
- All requests with `Authorization: Bearer fake-token` return 401 (auth-first via `withSupabase`).
- Functions importing `ai` need `deno test --allow-sys --no-check` or `--allow-all`.

## Deno Conventions

- Prefer jsr.io imports over deno.land/std URLs.
- Declare npm dependencies in `deno.json` imports.
- Do NOT use esm.sh CDN URLs.

## Test Running Commands

Run all tests:
```bash
cd supabase/functions && deno task test
```

Run single function tests:
```bash
cd supabase/functions && deno test tests/<function-name>/ --allow-all --no-check
```
