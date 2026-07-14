-- Cho phép người dùng bình thường (authenticated users) có quyền xem câu hỏi đang hoạt động
-- Giải quyết lỗi user thông thường vào bài học bị hiện "Chưa có câu hỏi"

DROP POLICY IF EXISTS "Only admins can view questions base table" ON public.questions;
DROP POLICY IF EXISTS "Only admins can view questions directly" ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can view active questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can view active questions" ON public.questions;

CREATE POLICY "Authenticated users can view active questions"
ON public.questions FOR SELECT
TO authenticated
USING (is_active = true);
