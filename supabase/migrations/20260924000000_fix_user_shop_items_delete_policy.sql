-- Add missing DELETE policy for user_shop_items
-- Without this, RLS blocks all DELETE operations silently (no error returned)
CREATE POLICY "Users can delete own shop items"
  ON public.user_shop_items FOR DELETE
  USING (auth.uid() = user_id);
