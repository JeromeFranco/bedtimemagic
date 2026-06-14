export type Protagonist = 'barnaby' | 'nova' | 'pip' | 'luna' | 'rex';

export interface ProtagonistInfo {
  id: Protagonist;
  name: string;
  species: string;
  emoji: string;
}

export const PROTAGONISTS: ProtagonistInfo[] = [
  { id: 'barnaby', name: 'Barnaby', species: 'Bear', emoji: '🐻' },
  { id: 'nova', name: 'Captain Nova', species: 'Star Pilot', emoji: '🚀' },
  { id: 'pip', name: 'Pip', species: 'Penguin', emoji: '🐧' },
  { id: 'luna', name: 'Luna', species: 'Owl', emoji: '🦉' },
  { id: 'rex', name: 'Rex', species: 'Dragon', emoji: '🐉' },
];

export type Challenge = 'anger' | 'sharing' | 'screentime' | 'truth' | 'chores' | 'custom';

export interface ChallengeInfo {
  id: Challenge;
  label: string;
  emoji: string;
}

export const CHALLENGES: ChallengeInfo[] = [
  { id: 'anger', label: 'Managing Anger', emoji: '😤' },
  { id: 'sharing', label: 'Sharing', emoji: '🤝' },
  { id: 'screentime', label: 'Screen-time', emoji: '📱' },
  { id: 'truth', label: 'Telling the Truth', emoji: '🤥' },
  { id: 'chores', label: 'Chores & Patience', emoji: '🧹' },
];

export interface ChildProfile {
  id: string;
  user_id: string;
  name: string;
  age: number;
  protagonist: Protagonist;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  child_id: string;
  title: string;
  story_text: string;
  moral: string;
  pillow_talk_prompt: string;
  sleepy_affirmation: string;
  cover_image_url: string | null;
  challenge: Challenge;
  protagonist: Protagonist;
  created_at: string;
}

export interface LessonLog {
  id: string;
  user_id: string;
  story_id: string;
  child_id: string;
  rating: 'great' | 'okay' | 'missed';
  created_at: string;
}

export type StoryRating = LessonLog['rating'];
