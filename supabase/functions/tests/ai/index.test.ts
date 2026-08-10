import { assertEquals, assertThrows } from "@std/assert";
import {
  AI_MODELS,
  createAiGatewayClient,
  createMimoClient,
} from "../../_shared/ai.ts";

Deno.test("AI_MODELS keeps generation models in one configuration", () => {
  assertEquals(AI_MODELS.story, "mimo-v2.5-pro");
  assertEquals(AI_MODELS.coverImage, "bfl/flux-2-klein-4b");
});

Deno.test("createMimoClient requires MIMO_API_KEY", () => {
  const previous = Deno.env.get("MIMO_API_KEY");
  Deno.env.delete("MIMO_API_KEY");
  try {
    assertThrows(() => createMimoClient(), Error, "MIMO_API_KEY not configured");
  } finally {
    if (previous) Deno.env.set("MIMO_API_KEY", previous);
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
