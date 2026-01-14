-- Drop the current restrictive policy
DROP POLICY IF EXISTS "Only admins can view questions directly" ON public.questions;

-- Create policy that allows SELECT on questions for authenticated users (needed for the view)
-- But they can only see active questions
CREATE POLICY "Authenticated users can view active questions"
ON public.questions FOR SELECT
TO authenticated
USING (is_active = true);

-- Keep admin full access policy (already exists as "Admins can manage questions")