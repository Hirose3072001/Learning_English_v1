-- Create shop_items table
CREATE TABLE public.shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('streak_protect', 'heart_restore')),
  effect_value INTEGER,
  cost_gems INTEGER NOT NULL,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_shop_items table (user inventory)
CREATE TABLE public.user_shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_item_id)
);

-- Create streak_protection table (track active protections)
CREATE TABLE public.streak_protections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  protection_days INTEGER NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, expires_at)
);

-- Enable RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_protections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shop_items (public read)
CREATE POLICY "Anyone can view shop items"
  ON public.shop_items FOR SELECT
  USING (is_active = true);

-- RLS for user_shop_items (own items only)
CREATE POLICY "Users can view own shop items"
  ON public.user_shop_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shop items"
  ON public.user_shop_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shop items"
  ON public.user_shop_items FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS for streak_protections
CREATE POLICY "Users can view own protections"
  ON public.streak_protections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own protections"
  ON public.streak_protections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Insert default shop items
INSERT INTO public.shop_items (name, description, type, effect_value, cost_gems, icon) VALUES
('Thuốc giữ Streak 1 ngày', 'Giữ Streak trong 1 ngày nếu không học', 'streak_protect', 1, 50, 'shield'),
('Thuốc giữ Streak 3 ngày', 'Giữ Streak trong 3 ngày nếu không học', 'streak_protect', 3, 120, 'shield'),
('Hồi phục Trái tim', 'Hồi phục tất cả trái tim', 'heart_restore', 5, 30, 'heart');
