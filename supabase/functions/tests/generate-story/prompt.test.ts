import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildPrompt } from "../../generate-story/prompt.ts";

Deno.test("buildPrompt - system prompt contains story arc structure", () => {
  const { system } = buildPrompt({
    protagonistName: "Barnaby",
    protagonistSpecies: "Bear",
    protagonistPersonality: "Gentle, patient bear",
    childNickname: "Alex",
    developmentalStage: "preschool",
    tier1ChallengeLabel: "Bedtime Friction",
    tier2TriggerLabel: "Leaving the bedroom",
  });

  assertStringIncludes(system, "STORY STRUCTURE");
  assertStringIncludes(system, "SETUP");
  assertStringIncludes(system, "CHALLENGE");
  assertStringIncludes(system, "RESOLUTION");
  assertStringIncludes(system, "LANDING");
});

Deno.test("buildPrompt - system prompt contains teaching approach", () => {
  const { system } = buildPrompt({
    protagonistName: "Barnaby",
    protagonistSpecies: "Bear",
    protagonistPersonality: "Gentle, patient bear",
    childNickname: "Alex",
    developmentalStage: "preschool",
    tier1ChallengeLabel: "Bedtime Friction",
    tier2TriggerLabel: "Leaving the bedroom",
  });

  assertStringIncludes(system, "TEACHING APPROACH");
  assertStringIncludes(system, "DOES NOT lecture");
  assertStringIncludes(system, "gentle metaphors");
});

Deno.test("buildPrompt - system prompt contains output field guidance", () => {
  const { system } = buildPrompt({
    protagonistName: "Barnaby",
    protagonistSpecies: "Bear",
    protagonistPersonality: "Gentle, patient bear",
    childNickname: "Alex",
    developmentalStage: "preschool",
    tier1ChallengeLabel: "Bedtime Friction",
    tier2TriggerLabel: "Leaving the bedroom",
  });

  assertStringIncludes(system, "OUTPUT FIELD GUIDANCE");
  assertStringIncludes(system, "pillowTalkPrompt");
  assertStringIncludes(system, "sleepyAffirmation");
});

Deno.test("buildPrompt - user prompt includes stage profile for preschool", () => {
  const { user } = buildPrompt({
    protagonistName: "Barnaby",
    protagonistSpecies: "Bear",
    protagonistPersonality: "Gentle, patient bear",
    childNickname: "Alex",
    developmentalStage: "preschool",
    tier1ChallengeLabel: "Bedtime Friction",
    tier2TriggerLabel: "Leaving the bedroom",
  });

  assertStringIncludes(user, "Preschool (ages 4-5)");
  assertStringIncludes(user, "5-8 words per sentence");
  assertStringIncludes(user, "Concrete, familiar objects");
});

Deno.test("buildPrompt - user prompt includes stage profile for early_primary", () => {
  const { user } = buildPrompt({
    protagonistName: "Luna",
    protagonistSpecies: "Owl",
    protagonistPersonality: "Wise owl",
    childNickname: "Sam",
    developmentalStage: "early_primary",
    tier1ChallengeLabel: "Big Emotions / Anger",
    tier2TriggerLabel: "Yelling",
  });

  assertStringIncludes(user, "Early Primary (ages 6-7)");
  assertStringIncludes(user, "8-12 words per sentence");
  assertStringIncludes(user, "Simple metaphors allowed");
});

Deno.test("buildPrompt - user prompt includes stage profile for older_kids", () => {
  const { user } = buildPrompt({
    protagonistName: "Rex",
    protagonistSpecies: "Dragon",
    protagonistPersonality: "Friendly dragon",
    childNickname: "Jordan",
    developmentalStage: "older_kids",
    tier1ChallengeLabel: "Social Skills",
    tier2TriggerLabel: "Sharing toys",
  });

  assertStringIncludes(user, "Older Kids (ages 8-10)");
  assertStringIncludes(user, "10-15 words per sentence");
  assertStringIncludes(user, "Extended metaphors");
});

Deno.test("buildPrompt - user prompt includes protagonist details", () => {
  const { user } = buildPrompt({
    protagonistName: "Captain Nova",
    protagonistSpecies: "Star Pilot",
    protagonistPersonality: "Brave space explorer",
    childNickname: "Mia",
    developmentalStage: "preschool",
    tier1ChallengeLabel: "Screen Time Limits",
    tier2TriggerLabel: "Stopping video games",
  });

  assertStringIncludes(user, "Captain Nova the Star Pilot");
  assertStringIncludes(user, "Brave space explorer");
  assertStringIncludes(user, "Mia");
});

Deno.test("buildPrompt - user prompt falls back for unknown stage", () => {
  const { user } = buildPrompt({
    protagonistName: "Barnaby",
    protagonistSpecies: "Bear",
    protagonistPersonality: "Gentle, patient bear",
    childNickname: "Alex",
    developmentalStage: "unknown_stage",
    tier1ChallengeLabel: "Bedtime Friction",
    tier2TriggerLabel: "Leaving the bedroom",
  });

  assertStringIncludes(user, "Adjust vocabulary and sentence complexity accordingly");
});
