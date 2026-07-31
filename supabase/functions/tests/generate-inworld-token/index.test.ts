import { assertEquals } from "@std/assert";
import {
  handleRequest,
  handler,
  formatInworldDate,
  decodeInworldApiKey,
  createInworldAuthorization,
} from "../../generate-inworld-token/index.ts";

function configureAuth() {
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_PUBLISHABLE_KEYS", "test-anon-key");
}

Deno.test("returns 204 for OPTIONS", async () => {
  configureAuth();
  const response = await handleRequest(new Request("http://localhost", { method: "OPTIONS" }));
  assertEquals(response.status, 204);
});

Deno.test("rejects requests without a Supabase authorization header", async () => {
  configureAuth();
  const response = await handleRequest(new Request("http://localhost", { method: "POST" }));
  assertEquals(response.status, 401);
});

Deno.test("rejects fake Supabase tokens before reading Inworld configuration", async () => {
  configureAuth();
  Deno.env.delete("IN_WORLD_API_KEY");
  const response = await handleRequest(new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
  }));
  assertEquals(response.status, 401);
});

Deno.test("formatInworldDate strips milliseconds", () => {
  const date = new Date("2026-07-31T12:00:00.123Z");
  assertEquals(formatInworldDate(date), "2026-07-31T12:00:00Z");
});

Deno.test("formatInworldDate preserves whole seconds", () => {
  const date = new Date("2026-07-31T12:00:45.000Z");
  assertEquals(formatInworldDate(date), "2026-07-31T12:00:45Z");
});

Deno.test("decodeInworldApiKey decodes Base64 and splits on first colon", () => {
  const encoded = btoa("my-key:my-secret");
  const result = decodeInworldApiKey(encoded);
  assertEquals(result.key, "my-key");
  assertEquals(result.secret, "my-secret");
});

Deno.test("decodeInworldApiKey throws on missing colon in decoded value", () => {
  const encoded = btoa("no-colon-here");
  let threw = false;
  try {
    decodeInworldApiKey(encoded);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("decodeInworldApiKey throws when key part is empty", () => {
  const encoded = btoa(":my-secret");
  let threw = false;
  try {
    decodeInworldApiKey(encoded);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("decodeInworldApiKey throws when secret part is empty", () => {
  const encoded = btoa("my-key:");
  let threw = false;
  try {
    decodeInworldApiKey(encoded);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("createInworldAuthorization produces IW1-HMAC-SHA256 prefix", async () => {
  const auth = await createInworldAuthorization({
    apiKey: { key: "test-key", secret: "test-secret" },
    now: new Date("2026-07-31T12:00:00Z"),
    nonce: "test-nonce",
    engineHost: "api-engine.inworld.ai",
  });
  assertEquals(auth.startsWith("IW1-HMAC-SHA256 "), true);
  assertEquals(auth.includes("ApiKey=test-key"), true);
  assertEquals(auth.includes("Nonce=test-nonce"), true);
});

Deno.test("createInworldAuthorization signature is deterministic", async () => {
  const params = {
    apiKey: { key: "k", secret: "s" },
    now: new Date("2026-01-01T00:00:00Z"),
    nonce: "n",
    engineHost: "h",
  };
  const a = await createInworldAuthorization(params);
  const b = await createInworldAuthorization(params);
  assertEquals(a, b);
});

Deno.test("successful token exchange returns only approved fields", async () => {
  configureAuth();
  Deno.env.set("IN_WORLD_API_KEY", btoa("my-key:my-secret"));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    assertEquals(url, "https://api.inworld.ai/auth/v1/tokens/token:generate");
    assertEquals(init?.method, "POST");

    const headers = init?.headers as Record<string, string>;
    assertEquals(headers["Content-Type"], "application/json");
    assertEquals(headers["Authorization"].startsWith("IW1-HMAC-SHA256 "), true);

    const body = JSON.parse(init?.body as string);
    assertEquals(body.key, "my-key");
    assertEquals(body.resources, []);

    return new Response(
      JSON.stringify({
        token: "fake-jwt-token",
        expirationTime: "2026-08-01T00:00:00Z",
        type: "Bearer",
        shouldNotLeak: "secret-data",
        extraField: "ignored",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const response = await handler(
      new Request("http://localhost", { method: "POST" }),
      {} as any,
    );
    assertEquals(response.status, 200);
    const data = await response.json();
    assertEquals(data.token, "fake-jwt-token");
    assertEquals(data.expirationTime, "2026-08-01T00:00:00Z");
    assertEquals(data.type, "Bearer");
    assertEquals(data.shouldNotLeak, undefined);
    assertEquals(data.extraField, undefined);
    assertEquals(Object.keys(data).length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("upstream 503 returns 502 to client", async () => {
  configureAuth();
  Deno.env.set("IN_WORLD_API_KEY", btoa("my-key:my-secret"));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (): Promise<Response> => {
    return new Response("Service Unavailable", { status: 503 });
  };

  try {
    const response = await handler(
      new Request("http://localhost", { method: "POST" }),
      {} as any,
    );
    assertEquals(response.status, 502);
    const data = await response.json();
    assertEquals(data.error, "Upstream request failed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
