-- Create vocabulary table to store words for each lesson
CREATE TABLE public.vocabulary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  pronunciation TEXT,
  example TEXT,
  audio_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active vocabulary"
ON public.vocabulary
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage vocabulary"
ON public.vocabulary
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_vocabulary_lesson_id ON public.vocabulary(lesson_id);

-- Add trigger for updated_at
CREATE TRIGGER update_vocabulary_updated_at
BEFORE UPDATE ON public.vocabulary
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();