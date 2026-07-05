import { buildCoverPrompt, mapChallengeToScene, handleRequest } from "./index.ts";
import { assertEquals } from "@std/assert";

// Set required env vars for withSupabase initialization
Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
Deno.env.set("SUPABASE_PUBLISHABLE_KEYS", "test-publishable-key");
Deno.env.set("SUPABASE_SECRET_KEY", "sb_secret_test-key");

Deno.test("mapChallengeToScene returns scene for stopping_games", () => {
  const scene = mapChallengeToScene("stopping_games");
  assertEquals(scene, "a child happily putting away a video game controller in a cozy room");
});

Deno.test("mapChallengeToScene returns scene for staying_up_late", () => {
  const scene = mapChallengeToScene("staying_up_late");
  assertEquals(scene, "a peaceful bedroom with stars and moon visible through a window");
});

Deno.test("mapChallengeToScene returns scene for sharing_toys", () => {
  const scene = mapChallengeToScene("sharing_toys");
  assertEquals(scene, "friendly characters sharing and playing together gently");
});

Deno.test("mapChallengeToScene returns scene for yelling", () => {
  const scene = mapChallengeToScene("yelling");
  assertEquals(scene, "a child taking a deep breath with calming colors around");
});

Deno.test("mapChallengeToScene returns default for unknown", () => {
  const scene = mapChallengeToScene("unknown");
  assertEquals(scene, "a cozy bedtime scene");
});

Deno.test("mapChallengeToScene covers all 12 DB challenges", () => {
  const challenges = [
    "stopping_games", "turning_off_tv", "giving_back_tablet",
    "yelling", "hitting", "tantrum_no",
    "leaving_bedroom", "refusing_teeth", "staying_up_late",
    "sharing_toys", "telling_truth", "chores_patience",
  ];
  for (const c of challenges) {
    const scene = mapChallengeToScene(c);
    assertEquals(scene !== "a cozy bedtime scene", true, `Expected specific scene for "${c}", got fallback`);
  }
});

Deno.test("buildCoverPrompt includes title and style", () => {
  const prompt = buildCoverPrompt("Barnaby's Big Night", "bear", "staying_up_late");
  const text = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  assertEquals(text.includes("Barnaby's Big Night"), true);
  assertEquals(text.includes("watercolor"), true);
  assertEquals(text.includes("bear"), true);
});

Deno.test("buildCoverPrompt uses scene from challenge", () => {
  const prompt = buildCoverPrompt("Test", "bear", "sharing_toys");
  assertEquals(prompt.includes("sharing and playing together"), true);
});

Deno.test("handleRequest returns 401 for non-POST without auth", async () => {
  const req = new Request("http://localhost", { method: "GET" });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
});

Deno.test("handleRequest returns 401 without auth header", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ storyId: "123", title: "Test" }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
});

Deno.test("handleRequest returns 401 with invalid token (before body validation)", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: JSON.stringify({ title: "Test" }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
});

Deno.test("handleRequest returns 401 for invalid JSON body with fake token", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: "not-json",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
});

Deno.test("handleRequest returns 401 with invalid token (missing title)", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: JSON.stringify({ storyId: "123" }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
});
