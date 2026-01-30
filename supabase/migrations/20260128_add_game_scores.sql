-- Create game_scores table
CREATE TABLE public.game_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    game_id TEXT NOT NULL, -- 'word_defense', etc.
    score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, game_id)
);

-- Enable RLS
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all scores"
  ON public.game_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own scores"
  ON public.game_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scores"
  ON public.game_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_game_scores_updated_at
  BEFORE UPDATE ON public.game_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
