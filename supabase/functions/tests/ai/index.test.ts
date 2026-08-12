import { assertEquals, assertThrows } from "@std/assert";
import {
  createAiGatewayClient,
  createDeepSeekClient,
  createMimoClient,
} from "../../_shared/ai.ts";

Deno.test("createMimoClient requires MIMO_API_KEY", () => {
  const previous = Deno.env.get("MIMO_API_KEY");
  Deno.env.delete("MIMO_API_KEY");
  try {
    assertThrows(() => createMimoClient(), Error, "MIMO_API_KEY not configured");
  } finally {
    if (previous) Deno.env.set("MIMO_API_KEY", previous);
  }
});

Deno.test("createMimoClient configures the story model", () => {
  const previous = Deno.env.get("MIMO_API_KEY");
  Deno.env.set("MIMO_API_KEY", "test-key");
  try {
    assertEquals(createMimoClient().model, "mimo-v2.5-pro");
  } finally {
    if (previous) Deno.env.set("MIMO_API_KEY", previous);
    else Deno.env.delete("MIMO_API_KEY");
  }
});

Deno.test("createAiGatewayClient requires AI_GATEWAY_API_KEY", () => {
  const previous = Deno.env.get("AI_GATEWAY_API_KEY");
  Deno.env.delete("AI_GATEWAY_API_KEY");
  try {
    assertThrows(
      () => createAiGatewayClient(),
      Error,
      "AI_GATEWAY_API_KEY not configured",
    );
  } finally {
    if (previous) Deno.env.set("AI_GATEWAY_API_KEY", previous);
  }
});

Deno.test("createAiGatewayClient configures the cover image model", () => {
  const previous = Deno.env.get("AI_GATEWAY_API_KEY");
  Deno.env.set("AI_GATEWAY_API_KEY", "test-key");
  try {
    assertEquals(createAiGatewayClient().model, "bfl/flux-2-klein-4b");
  } finally {
    if (previous) Deno.env.set("AI_GATEWAY_API_KEY", previous);
    else Deno.env.delete("AI_GATEWAY_API_KEY");
  }
});

Deno.test("createDeepSeekClient requires DEEPSEEK_API_KEY", () => {
  const previous = Deno.env.get("DEEPSEEK_API_KEY");
  Deno.env.delete("DEEPSEEK_API_KEY");
  try {
    assertThrows(
      () => createDeepSeekClient(),
      Error,
      "DEEPSEEK_API_KEY not configured",
    );
  } finally {
    if (previous) Deno.env.set("DEEPSEEK_API_KEY", previous);
  }
});

Deno.test("createDeepSeekClient configures the DeepSeek Flash model", () => {
  const previous = Deno.env.get("DEEPSEEK_API_KEY");
  Deno.env.set("DEEPSEEK_API_KEY", "test-key");
  try {
    assertEquals(createDeepSeekClient().model, "deepseek-v4-flash");
  } finally {
    if (previous) Deno.env.set("DEEPSEEK_API_KEY", previous);
    else Deno.env.delete("DEEPSEEK_API_KEY");
  }
});
