# Edge Functions — Agent Guidelines

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
- Run tests from each function's directory: `cd supabase/functions/<name> && deno test --allow-all`.
