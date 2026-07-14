-- Create achievements table for tracking dynamic user achievements and badges
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'book',
  condition_type TEXT NOT NULL DEFAULT 'xp',
  condition_value INTEGER NOT NULL DEFAULT 10,
  reward_gems INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view active achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;

-- RLS for achievements
CREATE POLICY "Anyone can view active achievements"
ON public.achievements FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage achievements"
ON public.achievements FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Insert initial sample achievements if table is empty
INSERT INTO public.achievements (title, description, icon, condition_type, condition_value, reward_gems, order_index)
SELECT 'Người mới', 'Hoàn thành bài học đầu tiên (tích lũy XP lớn hơn 0)', 'book', 'xp', 10, 20, 1
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE title = 'Người mới');

INSERT INTO public.achievements (title, description, icon, condition_type, condition_value, reward_gems, order_index)
SELECT 'Đốt cháy', 'Duy trì 7 ngày streak liên tục', 'flame', 'streak', 7, 50, 2
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE title = 'Đốt cháy');

INSERT INTO public.achievements (title, description, icon, condition_type, condition_value, reward_gems, order_index)
SELECT 'Chăm chỉ', 'Duy trì 30 ngày streak liên tục', 'flame', 'streak', 30, 200, 3
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE title = 'Chăm chỉ');

INSERT INTO public.achievements (title, description, icon, condition_type, condition_value, reward_gems, order_index)
SELECT 'Tri thức', 'Tích lũy đạt 500 XP', 'zap', 'xp', 500, 100, 4
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE title = 'Tri thức');

INSERT INTO public.achievements (title, description, icon, condition_type, condition_value, reward_gems, order_index)
SELECT 'Bậc thầy', 'Tích lũy đạt 2000 XP', 'trophy', 'xp', 2000, 300, 5
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE title = 'Bậc thầy');
