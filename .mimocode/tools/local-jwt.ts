/**
 * Generate HS256 JWT tokens for local Supabase development.
 *
 * Usage:
 *   deno run -A .mimocode/tools/local-jwt.ts service_role
 *   deno run -A .mimocode/tools/local-jwt.ts authenticated <user_id>
 */

const LOCAL_JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";
const LOCAL_ISSUER = "http://127.0.0.1:54321/auth/v1";

export async function makeJWT(
  role: string,
  sub?: string,
  secret: string = LOCAL_JWT_SECRET,
): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    iss: LOCAL_ISSUER,
    role,
    aud: "authenticated",
    iat: now,
    exp: now + 3600,
  };
  if (sub) payload.sub = sub;

  const body = btoa(JSON.stringify(payload))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const data = new TextEncoder().encode(`${header}.${body}`);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${header}.${body}.${signature}`;
}

// CLI entry point
if (import.meta.main) {
  const role = Deno.args[0];
  const sub = Deno.args[1];

  if (!role) {
    console.error("Usage: deno run -A local-jwt.ts <role> [user_id]");
    console.error("  role: service_role | authenticated | anon");
    console.error("  user_id: UUID for authenticated role");
    Deno.exit(1);
  }

  const token = await makeJWT(role, sub);
  console.log(token);
}
