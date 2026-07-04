import { assertEquals } from "@std/assert";
import {
  parseJsonResponse,
  validateStoryFields,
  callLLM,
  handleRequest,
  SafetyFilterError,
} from "./index.ts";

Deno.test("parseJsonResponse - parses valid JSON", () => {
  const input = JSON.stringify({ title: "Test", storyText: "A story" });
  const result = parseJsonResponse(input);
  assertEquals(result.title, "Test");
  assertEquals(result.storyText, "A story");
});

Deno.test("parseJsonResponse - strips markdown fences", () => {
  const input = '```json\n{"title":"Test"}\n```';
  const result = parseJsonResponse(input);
  assertEquals(result.title, "Test");
});

Deno.test("parseJsonResponse - strips plain code fences", () => {
  const input = '```\n{"title":"Test"}\n```';
  const result = parseJsonResponse(input);
  assertEquals(result.title, "Test");
});

Deno.test("parseJsonResponse - trims whitespace", () => {
  const input = '  \n  {"title":"Test"}  \n  ';
  const result = parseJsonResponse(input);
  assertEquals(result.title, "Test");
});

Deno.test("parseJsonResponse - throws SafetyFilterError for 'I can't'", () => {
  try {
    parseJsonResponse("I can't help with that request.");
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(e instanceof SafetyFilterError, true);
  }
});

Deno.test("parseJsonResponse - throws SafetyFilterError for 'I'm unable'", () => {
  try {
    parseJsonResponse("I'm unable to generate that content.");
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(e instanceof SafetyFilterError, true);
  }
});

Deno.test("parseJsonResponse - throws SafetyFilterError for 'I apologize'", () => {
  try {
    parseJsonResponse("I apologize, but I cannot do this.");
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(e instanceof SafetyFilterError, true);
  }
});

Deno.test("parseJsonResponse - throws SafetyFilterError for 'I'm sorry, but I'", () => {
  try {
    parseJsonResponse("I'm sorry, but I can't generate this story.");
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(e instanceof SafetyFilterError, true);
  }
});

Deno.test("parseJsonResponse - throws SafetyFilterError for 'As an AI'", () => {
  try {
    parseJsonResponse("As an AI language model, I cannot do that.");
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(e instanceof SafetyFilterError, true);
  }
});

Deno.test("parseJsonResponse - throws SafetyFilterError for 'Unfortunately, I'", () => {
  try {
    parseJsonResponse("Unfortunately, I am unable to fulfill this request.");
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(e instanceof SafetyFilterError, true);
  }
});

Deno.test("parseJsonResponse - throws SyntaxError for invalid JSON", () => {
  try {
    parseJsonResponse("not json at all");
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(e instanceof SyntaxError, true);
  }
});

Deno.test("validateStoryFields - passes for complete story", () => {
  const story = {
    title: "Test Title",
    storyText: "A story about a bear.",
    moral: "Be kind.",
    pillowTalkPrompt: "What made you happy today?",
    sleepyAffirmation: "You are safe and loved.",
  };
  validateStoryFields(story);
});

Deno.test("validateStoryFields - throws for missing title", () => {
  try {
    validateStoryFields({
      storyText: "text",
      moral: "moral",
      pillowTalkPrompt: "prompt",
      sleepyAffirmation: "affirmation",
    });
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "Story missing required fields: title");
  }
});

Deno.test("validateStoryFields - throws for empty title", () => {
  try {
    validateStoryFields({
      title: "",
      storyText: "text",
      moral: "moral",
      pillowTalkPrompt: "prompt",
      sleepyAffirmation: "affirmation",
    });
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "Story missing required fields: title");
  }
});

Deno.test("validateStoryFields - throws for whitespace-only title", () => {
  try {
    validateStoryFields({
      title: "   ",
      storyText: "text",
      moral: "moral",
      pillowTalkPrompt: "prompt",
      sleepyAffirmation: "affirmation",
    });
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "Story missing required fields: title");
  }
});

Deno.test("validateStoryFields - throws for multiple missing fields", () => {
  try {
    validateStoryFields({ title: "Title" });
    throw new Error("Should have thrown");
  } catch (e) {
    const msg = (e as Error).message;
    assertEquals(msg.includes("storyText"), true);
    assertEquals(msg.includes("moral"), true);
    assertEquals(msg.includes("pillowTalkPrompt"), true);
    assertEquals(msg.includes("sleepyAffirmation"), true);
  }
});

Deno.test("callLLM - returns parsed story on success", async () => {
  const storyJson = JSON.stringify({
    title: "Barnaby's Big Day",
    storyText: "Once upon a time...",
    moral: "Be patient.",
    pillowTalkPrompt: "What was your favorite part?",
    sleepyAffirmation: "You are loved.",
  });

  const mockClient = {
    chat: {
      completions: {
        create: () =>
          Promise.resolve({
            choices: [{ message: { content: storyJson } }],
          }),
      },
    },
  };

  const result = await callLLM(mockClient as any, "system", "user");
  assertEquals(result.title, "Barnaby's Big Day");
  assertEquals(result.moral, "Be patient.");
});

Deno.test("callLLM - throws SafetyFilterError on refusal", async () => {
  const mockClient = {
    chat: {
      completions: {
        create: () =>
          Promise.resolve({
            choices: [{ message: { content: "I'm sorry, but I can't do that." } }],
          }),
      },
    },
  };

  try {
    await callLLM(mockClient as any, "system", "user");
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(e instanceof SafetyFilterError, true);
  }
});

Deno.test("callLLM - throws on empty response", async () => {
  const mockClient = {
    chat: {
      completions: {
        create: () =>
          Promise.resolve({
            choices: [{ message: { content: null } }],
          }),
      },
    },
  };

  try {
    await callLLM(mockClient as any, "system", "user");
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "Empty response from model");
  }
});

Deno.test("callLLM - strips markdown fences from response", async () => {
  const storyJson = '```json\n{"title":"Test","storyText":"text","moral":"moral","pillowTalkPrompt":"prompt","sleepyAffirmation":"affirm"}\n```';
  const mockClient = {
    chat: {
      completions: {
        create: () =>
          Promise.resolve({
            choices: [{ message: { content: storyJson } }],
          }),
      },
    },
  };

  const result = await callLLM(mockClient as any, "system", "user");
  assertEquals(result.title, "Test");
});

Deno.test("handleRequest - returns 200 for OPTIONS preflight", async () => {
  const req = new Request("http://localhost", { method: "OPTIONS" });
  const res = await handleRequest(req);
  assertEquals(res.status, 200);
  const text = await res.text();
  assertEquals(text, "ok");
});

Deno.test("handleRequest - returns 401 when no Authorization header", async () => {
  Deno.env.set("MIMO_API_KEY", "test-key");
  const req = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({
      childId: "c1",
      protagonistId: "barnaby",
      childNickname: "Alex",
      developmentalStage: "preschool",
      tier1Challenge: "bedtime",
      tier2Trigger: "leaving_bedroom",
    }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
  Deno.env.delete("MIMO_API_KEY");
});

Deno.test("handleRequest - returns 400 for missing fields", async () => {
  Deno.env.set("MIMO_API_KEY", "test-key");
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: JSON.stringify({ childId: "c1" }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Missing required fields");
  Deno.env.delete("MIMO_API_KEY");
});

Deno.test("handleRequest - returns 400 for invalid protagonist", async () => {
  Deno.env.set("MIMO_API_KEY", "test-key");
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: JSON.stringify({
      childId: "c1",
      protagonistId: "invalid",
      childNickname: "Alex",
      developmentalStage: "preschool",
      tier1Challenge: "bedtime",
      tier2Trigger: "leaving_bedroom",
    }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Invalid protagonist");
  Deno.env.delete("MIMO_API_KEY");
});

Deno.test("handleRequest - returns 400 for invalid JSON body", async () => {
  Deno.env.set("MIMO_API_KEY", "test-key");
  const req = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer fake-token" },
    body: "not-json",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Invalid JSON body");
  Deno.env.delete("MIMO_API_KEY");
});
