-- Remove the policy that allows direct access to questions table
DROP POLICY IF EXISTS "Authenticated users can view active questions" ON public.questions;

-- Only admins can view the base questions table (with correct_index)
-- Regular users must use questions_public view (which doesn't have correct_index)
CREATE POLICY "Only admins can view questions base table"
ON public.questions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create a restricted view for profiles (only leaderboard-relevant data)
CREATE OR REPLACE VIEW public.profiles_leaderboard AS
  SELECT id, user_id, username, display_name, avatar_url, xp
  FROM public.profiles;

-- Grant SELECT on the leaderboard view
GRANT SELECT ON public.profiles_leaderboard TO authenticated;
GRANT SELECT ON public.profiles_leaderboard TO anon;