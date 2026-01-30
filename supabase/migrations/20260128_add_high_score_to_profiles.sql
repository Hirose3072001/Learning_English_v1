-- Add high_score column to profiles table
ALTER TABLE public.profiles
ADD COLUMN high_score INTEGER NOT NULL DEFAULT 0;

-- Create index for better query performance
CREATE INDEX idx_profiles_high_score ON public.profiles(high_score DESC);
