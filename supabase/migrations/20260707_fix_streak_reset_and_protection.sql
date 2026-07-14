-- Update streak trigger to check and consume active streak protections when streak is broken
CREATE OR REPLACE FUNCTION public.update_streak_on_activity()
RETURNS TRIGGER AS $$
DECLARE
  profile_record RECORD;
  active_protection RECORD;
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
    -- Check if user has an active streak protection that has not expired
    SELECT * INTO active_protection 
    FROM public.streak_protections 
    WHERE user_id = NEW.user_id AND expires_at > now() 
    ORDER BY expires_at ASC LIMIT 1;
    
    IF active_protection IS NOT NULL THEN
      -- Protection is active! Keep streak and increment by 1, consume/delete the used protection
      DELETE FROM public.streak_protections WHERE id = active_protection.id;
      
      UPDATE public.profiles 
      SET streak_count = streak_count + 1, last_activity_date = today, updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      -- No active protection, streak broken
      UPDATE public.profiles 
      SET streak_count = 1, last_activity_date = today, updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  -- Same day - do nothing
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
