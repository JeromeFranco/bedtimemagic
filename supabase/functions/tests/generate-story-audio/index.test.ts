import { assertEquals } from "@std/assert";
import { handleRequest } from "../../generate-story-audio/index.ts";

// --- handleRequest integration tests ---

Deno.test("handleRequest - returns 204 for OPTIONS preflight", async () => {
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_PUBLISHABLE_KEYS", "test-anon-key");
  const req = new Request("http://localhost", { method: "OPTIONS" });
  const res = await handleRequest(req);
  assertEquals(res.status, 204);
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_PUBLISHABLE_KEYS");
});

Deno.test("handleRequest - returns 401 when no Authorization header", async () => {
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_PUBLISHABLE_KEYS", "test-anon-key");
  Deno.env.set("MIMO_API_KEY", "test-key");
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ story_text: "Hello world." }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_PUBLISHABLE_KEYS");
  Deno.env.delete("MIMO_API_KEY");
});

Deno.test("handleRequest - returns 401 for missing story_text (auth check first)", async () => {
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_PUBLISHABLE_KEYS", "test-anon-key");
  Deno.env.set("MIMO_API_KEY", "test-key");
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: JSON.stringify({}),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_PUBLISHABLE_KEYS");
  Deno.env.delete("MIMO_API_KEY");
});

Deno.test("handleRequest - returns 401 for empty story_text (auth check first)", async () => {
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_PUBLISHABLE_KEYS", "test-anon-key");
  Deno.env.set("MIMO_API_KEY", "test-key");
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: JSON.stringify({ story_text: "   " }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_PUBLISHABLE_KEYS");
  Deno.env.delete("MIMO_API_KEY");
});

Deno.test("handleRequest - returns 401 for invalid JSON body (auth check first)", async () => {
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_PUBLISHABLE_KEYS", "test-anon-key");
  Deno.env.set("MIMO_API_KEY", "test-key");
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: "not-json",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_PUBLISHABLE_KEYS");
  Deno.env.delete("MIMO_API_KEY");
});
