import { buildCoverPrompt, mapChallengeToScene, handleRequest } from "./index.ts";
import { assertEquals } from "@std/assert";

Deno.test("mapChallengeToScene returns scene for screentime", () => {
  const scene = mapChallengeToScene("screentime");
  assertEquals(scene, "a child putting away a device in a cozy room");
});

Deno.test("mapChallengeToScene returns scene for bedtime", () => {
  const scene = mapChallengeToScene("bedtime");
  assertEquals(scene, "a peaceful bedroom with stars and moon visible through a window");
});

Deno.test("mapChallengeToScene returns default for unknown", () => {
  const scene = mapChallengeToScene("unknown");
  assertEquals(scene, "a cozy bedtime scene");
});

Deno.test("buildCoverPrompt includes title and style", () => {
  const prompt = buildCoverPrompt("Barnaby's Big Night", "bear", "bedtime");
  const text = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  assertEquals(text.includes("Barnaby's Big Night"), true);
  assertEquals(text.includes("watercolor"), true);
  assertEquals(text.includes("bear"), true);
});

Deno.test("handleRequest returns 405 for non-POST", async () => {
  const req = new Request("http://localhost", { method: "GET" });
  const res = await handleRequest(req);
  assertEquals(res.status, 405);
});

Deno.test("handleRequest returns 401 without auth header", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ storyId: "123", title: "Test" }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
});

Deno.test("handleRequest returns 400 without storyId", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: JSON.stringify({ title: "Test" }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
});

Deno.test("handleRequest returns 400 for invalid JSON body", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: "not-json",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Invalid JSON body");
});

Deno.test("handleRequest returns 400 without title", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: JSON.stringify({ storyId: "123" }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "storyId and title are required");
});
