-- Add reward_streak column to quests table
ALTER TABLE public.quests ADD COLUMN reward_streak INTEGER DEFAULT 0;

-- Update existing quests to have 0 streak reward
UPDATE public.quests SET reward_streak = 0 WHERE reward_streak IS NULL;
