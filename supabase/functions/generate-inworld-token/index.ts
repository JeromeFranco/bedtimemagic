import { withSupabase, type SupabaseContext } from "@supabase/server";

export function formatInworldDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function decodeInworldApiKey(value: string): { key: string; secret: string } {
  const colonIndex = value.indexOf(":");
  if (colonIndex === -1) throw new Error("Invalid IN_WORLD_API_KEY format");
  return { key: value.slice(0, colonIndex), secret: value.slice(colonIndex + 1) };
}

async function hmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createInworldAuthorization(params: {
  apiKey: { key: string; secret: string };
  now: Date;
  nonce: string;
  engineHost: string;
}): Promise<string> {
  const { apiKey, now, nonce, engineHost } = params;
  const dateStr = formatInworldDate(now);

  let intermediate = await hmacSha256(`IW1${apiKey.secret}`, dateStr);
  intermediate = await hmacSha256(intermediate, nonce);
  intermediate = await hmacSha256(intermediate, engineHost);
  const signature = await hmacSha256(intermediate, "iw1_request");

  return `IW1-HMAC-SHA256 ApiKey=${apiKey.key},Date=${dateStr},Nonce=${nonce},Signature=${signature}`;
}

export async function handler(req: Request, _ctx: SupabaseContext): Promise<Response> {
  const rawKey = Deno.env.get("IN_WORLD_API_KEY");
  if (!rawKey) {
    return Response.json({ error: "Service not configured" }, { status: 500 });
  }

  let apiKey: { key: string; secret: string };
  try {
    apiKey = decodeInworldApiKey(rawKey);
  } catch {
    return Response.json({ error: "Service not configured" }, { status: 500 });
  }

  const now = new Date();
  const nonce = crypto.randomUUID();
  const engineHost = "api-engine.inworld.ai";
  const authorization = await createInworldAuthorization({
    apiKey,
    now,
    nonce,
    engineHost,
  });

  let upstream: Response;
  try {
    upstream = await fetch("https://api.inworld.ai/auth/v1/tokens/token:generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify({ key: apiKey.key, resources: [] }),
    });
  } catch {
    return Response.json({ error: "Upstream request failed" }, { status: 502 });
  }

  if (!upstream.ok) {
    return Response.json({ error: "Upstream request failed" }, { status: 502 });
  }

  const data = await upstream.json();
  return Response.json({
    token: data.token,
    expirationTime: data.expirationTime,
    type: data.type,
  });
}

export const handleRequest = withSupabase({ auth: "user" }, handler);

if (import.meta.main) {
  Deno.serve(handleRequest);
}
