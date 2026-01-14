-- 1. Tạo view cho questions không hiển thị correct_index cho học sinh
CREATE VIEW public.questions_public
WITH (security_invoker=on) AS
  SELECT id, lesson_id, question, options, order_index, is_active, explanation, created_at, updated_at
  FROM public.questions;
  -- Không bao gồm correct_index

-- 2. Xóa policy cũ cho phép anyone xem questions
DROP POLICY IF EXISTS "Anyone can view active questions" ON public.questions;

-- 3. Tạo policy mới: chỉ admin được xem trực tiếp bảng questions (bao gồm correct_index)
CREATE POLICY "Only admins can view questions directly"
ON public.questions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Thêm policy cho profiles: cho phép authenticated users xem thông tin cơ bản của người khác
CREATE POLICY "Authenticated users can view basic profiles for leaderboard"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 5. Xóa policy cũ vì đã có policy mới bao quát hơn
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;