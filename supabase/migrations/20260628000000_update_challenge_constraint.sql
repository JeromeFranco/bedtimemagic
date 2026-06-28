-- Update stories.challenge constraint to match ChallengeTrigger type
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_challenge_check;

ALTER TABLE public.stories ADD CONSTRAINT stories_challenge_check
  CHECK (challenge IN (
    'stopping_games', 'turning_off_tv', 'giving_back_tablet',
    'yelling', 'hitting', 'tantrum_no',
    'leaving_bedroom', 'refusing_teeth', 'staying_up_late',
    'sharing_toys', 'telling_truth', 'chores_patience'
  ));
