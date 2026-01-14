-- Drop the old view
DROP VIEW IF EXISTS public.questions_public;

-- Recreate view WITHOUT security_invoker (runs with definer privileges)
-- This view excludes correct_index for security
CREATE VIEW public.questions_public AS
  SELECT id, lesson_id, question, options, order_index, is_active, explanation, created_at, updated_at
  FROM public.questions
  WHERE is_active = true;

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.questions_public TO authenticated;
GRANT SELECT ON public.questions_public TO anon;