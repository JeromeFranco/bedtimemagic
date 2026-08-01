import { withSupabase, type SupabaseContext } from "@supabase/server";

export function formatInworldDate(date: Date): string {
  const iso = date.toISOString();
  return iso.slice(0, 10).replace(/-/g, "") + iso.slice(11, 19).replace(/:/g, "");
}

export function decodeInworldApiKey(value: string): { key: string; secret: string } {
  const decoded = atob(value);
  const colonIndex = decoded.indexOf(":");
  if (colonIndex === -1) throw new Error("Invalid IN_WORLD_API_KEY format");
  const key = decoded.slice(0, colonIndex);
  const secret = decoded.slice(colonIndex + 1);
  if (!key || !secret) throw new Error("Invalid IN_WORLD_API_KEY format");
  return { key, secret };
}

async function hmacSha256(key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === "string" ? encoder.encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
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
  const method = "ai.inworld.engine.WorldEngine/GenerateToken";

  let signature = await hmacSha256(`IW1${apiKey.secret}`, dateStr);
  signature = await hmacSha256(signature, engineHost.replace(":443", ""));
  signature = await hmacSha256(signature, method);
  signature = await hmacSha256(signature, nonce);
  signature = await hmacSha256(signature, "iw1_request");

  return `IW1-HMAC-SHA256 ApiKey=${apiKey.key},DateTime=${dateStr},Nonce=${nonce},Signature=${toHex(new Uint8Array(signature))}`;
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
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(1, 12);
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
