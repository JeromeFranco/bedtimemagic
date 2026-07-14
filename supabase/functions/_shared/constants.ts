export const PROTAGONISTS: Record<
  string,
  { name: string; species: string; personality: string; voiceNotes: string }
> = {
  barnaby: {
    name: "Barnaby",
    species: "Bear",
    personality:
      "Gentle, patient bear who loves warm hugs and honey. Always speaks slowly and kindly, making everyone feel safe.",
    voiceNotes: "Warm baritone, slow and comforting, like a cozy blanket",
  },
  nova: {
    name: "Captain Nova",
    species: "Star Pilot",
    personality:
      "Brave space explorer who is curious about every star. Speaks with wonder and excitement but calms down at bedtime.",
    voiceNotes: "Energetic but softening, like a campfire winding down",
  },
  pip: {
    name: "Pip",
    species: "Penguin",
    personality:
      "Playful penguin who waddles everywhere and loves sliding on ice. Always giggling and making others laugh.",
    voiceNotes: "Cheerful and slightly squeaky, like a happy child",
  },
  luna: {
    name: "Luna",
    species: "Owl",
    personality:
      "Wise owl who sees everything from her tree. Speaks softly with ancient knowledge, making the world feel magical.",
    voiceNotes: "Whispery and mysterious, like rustling leaves at night",
  },
  rex: {
    name: "Rex",
    species: "Dragon",
    personality:
      "Friendly dragon who breathes warm air and guards his friends fiercely. Despite his size, he is incredibly gentle.",
    voiceNotes: "Deep and rumbly but kind, like distant thunder fading",
  },
};

export const CHALLENGE_LABELS: Record<string, string> = {
  screentime: "Screen Time Limits",
  emotions: "Big Emotions / Anger",
  bedtime: "Bedtime Friction",
  social: "Social Skills",
};

export const TRIGGER_LABELS: Record<string, string> = {
  stopping_games: "Stopping video games",
  turning_off_tv: "Turning off the TV",
  giving_back_tablet: "Giving back the tablet",
  yelling: "Yelling",
  hitting: "Hitting/Pushing",
  tantrum_no: "Tantrum when told 'No'",
  leaving_bedroom: "Leaving the bedroom",
  refusing_teeth: "Refusing to brush teeth",
  staying_up_late: "Wanting to stay up late",
  sharing_toys: "Sharing toys",
  telling_truth: "Telling the truth",
  chores_patience: "Chores and Patience",
};

export const STAGE_LABELS: Record<string, string> = {
  preschool: "Preschool",
  early_primary: "Early Primary",
  older_kids: "Older Kids",
};

export const STAGE_PROFILES: Record<string, { label: string; vocabulary: string; sentences: string; concepts: string }> = {
  preschool: {
    label: "Preschool (ages 4-5)",
    vocabulary: "Concrete, familiar objects (blanket, stars, moon, teddy). Avoid abstract nouns. Use simple, warm words.",
    sentences: "5-8 words per sentence. Repetition welcome. Use 'and then... and then...' patterns. Keep paragraphs short.",
    concepts: "Cause-effect only. Name emotions directly ('Barnaby felt sad'). No metaphors yet - keep it literal and warm.",
  },
  early_primary: {
    label: "Early Primary (ages 6-7)",
    vocabulary: "Some abstract words (patience, kindness) with context clues. Mix familiar and new vocabulary.",
    sentences: "8-12 words per sentence. Mix simple and compound sentences. Dialogue can appear.",
    concepts: "Simple metaphors allowed ('her heart felt like a balloon deflating'). Basic perspective-taking.",
  },
  older_kids: {
    label: "Older Kids (ages 8-10)",
    vocabulary: "Richer vocabulary, figurative language, more descriptive prose.",
    sentences: "10-15 words per sentence. Complex sentences with subordinate clauses. Varied paragraph structure.",
    concepts: "Extended metaphors, perspective-taking, internal monologue. Can explore nuanced emotions.",
  },
};

export const CHALLENGE_SCENES: Record<string, string> = {
  stopping_games:
    "a child happily putting away a video game controller in a cozy room",
  turning_off_tv: "a child turning off a TV screen in a warm living room",
  giving_back_tablet: "a child gently handing back a tablet device",
  yelling: "a child taking a deep breath with calming colors around",
  hitting: "a child holding hands gently with a friend",
  tantrum_no: "a child sitting calmly after hearing the word no",
  leaving_bedroom:
    "a child snuggled in bed with a nightlight glowing softly",
  refusing_teeth: "a child smiling and brushing teeth at a bathroom sink",
  staying_up_late:
    "a peaceful bedroom with stars and moon visible through a window",
  sharing_toys: "friendly characters sharing and playing together gently",
  telling_truth: "a child speaking honestly with a warm golden glow around",
  chores_patience: "a child helping with chores in a tidy kitchen",
};
