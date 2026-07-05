# Test Edge Function (Local)

Test Supabase Edge Functions end-to-end against local Supabase with real API calls.

## Prerequisites

- Local Supabase running (`docker ps` shows `supabase_db_bedtimemagic`)
- Function has a `deno.json` with dependencies declared
- `AI_GATEWAY_API_KEY` in `supabase/functions/.env.local` (if function calls external APIs)

## Step 1: Generate Local JWT Tokens

The local JWT secret is `super-secret-jwt-token-with-at-least-32-characters-long`. Generate tokens using the tool:

```bash
deno run -A .mimocode/tools/local-jwt.ts service_role
deno run -A .mimocode/tools/local-jwt.ts authenticated <user_id>
```

Or inline in a test script:

```typescript
import { makeJWT } from "../../.mimocode/tools/local-jwt.ts";
const serviceKey = await makeJWT("service_role");
const userToken = await makeJWT("authenticated", userId);
```

## Step 2: Grant Table Permissions (First Time)

Local Supabase doesn't auto-expose tables. Run once after migrations:

```bash
docker exec supabase_db_bedtimemagic psql -U postgres -d postgres -c "
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
"
```

## Step 3: Seed Test Data

Insert required parent records (child, story, etc.) via docker psql:

```bash
docker exec supabase_db_bedtimemagic psql -U postgres -d postgres -c "
INSERT INTO public.children (user_id, name, protagonist, developmental_stage)
VALUES ('<user_id>', 'Test Child', 'barnaby', 'preschool')
RETURNING id;
"
```

Save the returned ID for use in the function call.

## Step 4: Create Test Script

Write a temporary test file that:
1. Loads env from `supabase/functions/.env.local`
2. Sets `SUPABASE_URL=http://127.0.0.1:54321`
3. Sets `SUPABASE_SECRET_KEY` to the secret key JWT
4. Sets `AI_GATEWAY_API_KEY` from env file
5. Imports and calls `handleRequest()` directly
6. Asserts on response status and body

Run with: `deno run -A test-<function-name>.ts`

Clean up the test file after verification.

## Step 5: Verify

Check:
- Response status is 200
- Response body contains expected data
- Side effects persisted (e.g., DB updated, storage uploaded)
- No duplicate path prefixes in storage URLs (e.g., `covers/covers/` bug)

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Expected 3 parts in JWT; got 1` | Raw secret passed as API key | Use service_role JWT, not raw string |
| `permission denied for table` | Table not exposed | Run GRANT statements (Step 2) |
| `Bucket not found` | Storage bucket missing | Create bucket via API or migration |
| `Story not found` (404) | Story in local DB but function hits remote | Set `SUPABASE_URL=http://127.0.0.1:54321` |
| `Unauthorized` (401) | JWT issuer mismatch | Use correct issuer: `http://127.0.0.1:54321/auth/v1` |
