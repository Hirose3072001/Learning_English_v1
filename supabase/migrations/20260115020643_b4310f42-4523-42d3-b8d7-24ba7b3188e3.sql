-- Create quests table for tracking user quests and rewards
CREATE TABLE public.quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  title TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('lessons', 'xp', 'streak')),
  target_value INTEGER NOT NULL DEFAULT 1,
  reward_gems INTEGER NOT NULL DEFAULT 10,
  icon TEXT DEFAULT 'target',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_quests table for tracking user progress on quests
CREATE TABLE public.user_quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  period_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_id, period_start)
);

-- Enable RLS
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

-- RLS for quests (public read)
CREATE POLICY "Anyone can view active quests"
ON public.quests FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage quests"
ON public.quests FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS for user_quests
CREATE POLICY "Users can view their own quest progress"
ON public.user_quests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quest progress"
ON public.user_quests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quest progress"
ON public.user_quests FOR UPDATE
USING (auth.uid() = user_id);

-- Insert default quests
INSERT INTO public.quests (type, title, description, target_type, target_value, reward_gems, icon) VALUES
('daily', 'Hoàn thành 1 bài học', 'Học một bài học mới hôm nay', 'lessons', 1, 10, 'book'),
('daily', 'Kiếm 50 XP', 'Tích lũy 50 điểm kinh nghiệm', 'xp', 50, 15, 'zap'),
('daily', 'Duy trì streak', 'Học mỗi ngày để duy trì streak', 'streak', 1, 5, 'flame'),
('weekly', 'Hoàn thành 10 bài học', 'Học 10 bài trong tuần', 'lessons', 10, 100, 'target'),
('weekly', 'Kiếm 500 XP', 'Tích lũy 500 XP trong tuần', 'xp', 500, 150, 'zap');

-- Add last_activity_date to profiles for streak tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- Update streak trigger
CREATE OR REPLACE FUNCTION public.update_streak_on_activity()
RETURNS TRIGGER AS $$
DECLARE
  profile_record RECORD;
  today DATE := CURRENT_DATE;
BEGIN
  SELECT * INTO profile_record FROM public.profiles WHERE user_id = NEW.user_id;
  
  IF profile_record IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF profile_record.last_activity_date IS NULL THEN
    -- First activity
    UPDATE public.profiles 
    SET streak_count = 1, last_activity_date = today, updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF profile_record.last_activity_date = today - 1 THEN
    -- Consecutive day
    UPDATE public.profiles 
    SET streak_count = streak_count + 1, last_activity_date = today, updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF profile_record.last_activity_date < today - 1 THEN
    -- Streak broken
    UPDATE public.profiles 
    SET streak_count = 1, last_activity_date = today, updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  -- Same day - do nothing
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_streak_trigger ON public.user_progress;

-- Create trigger on user_progress
CREATE TRIGGER update_streak_trigger
AFTER INSERT ON public.user_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_streak_on_activity();