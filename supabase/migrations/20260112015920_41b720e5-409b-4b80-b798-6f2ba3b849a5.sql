-- Fix profiles RLS: Remove overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Add INSERT policy for new users
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_index INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Questions RLS policies
CREATE POLICY "Anyone can view active questions" 
ON public.questions 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage questions" 
ON public.questions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample questions for existing lessons
INSERT INTO public.questions (lesson_id, question, options, correct_index, explanation, order_index)
SELECT 
  l.id,
  q.question,
  q.options::jsonb,
  q.correct_index,
  q.explanation,
  q.order_index
FROM public.lessons l
CROSS JOIN LATERAL (
  VALUES
    ('"Xin chào" nghĩa là gì?', '["Goodbye", "Hello", "Thank you", "Sorry"]', 1, 'Xin chào = Hello trong tiếng Anh', 0),
    ('Chọn cách nói "Hello" trong tiếng Việt', '["Tạm biệt", "Cảm ơn", "Xin chào", "Xin lỗi"]', 2, 'Hello = Xin chào', 1),
    ('"Tạm biệt" nghĩa là gì?', '["Hello", "Goodbye", "Please", "Thanks"]', 1, 'Tạm biệt = Goodbye', 2)
) AS q(question, options, correct_index, explanation, order_index)
WHERE l.title = 'Xin chào';

INSERT INTO public.questions (lesson_id, question, options, correct_index, explanation, order_index)
SELECT 
  l.id,
  q.question,
  q.options::jsonb,
  q.correct_index,
  q.explanation,
  q.order_index
FROM public.lessons l
CROSS JOIN LATERAL (
  VALUES
    ('"Mẹ" nghĩa là gì?', '["Father", "Mother", "Brother", "Sister"]', 1, 'Mẹ = Mother', 0),
    ('"Bố" là ai trong gia đình?', '["Mother", "Sister", "Father", "Brother"]', 2, 'Bố = Father', 1),
    ('Chọn từ đúng cho "Sister"', '["Anh", "Em gái", "Mẹ", "Bố"]', 1, 'Sister = Em gái/Chị gái', 2)
) AS q(question, options, correct_index, explanation, order_index)
WHERE l.title = 'Gia đình';

INSERT INTO public.questions (lesson_id, question, options, correct_index, explanation, order_index)
SELECT 
  l.id,
  q.question,
  q.options::jsonb,
  q.correct_index,
  q.explanation,
  q.order_index
FROM public.lessons l
CROSS JOIN LATERAL (
  VALUES
    ('"Cơm" là gì?', '["Bread", "Rice", "Noodles", "Soup"]', 1, 'Cơm = Rice - món ăn chính của người Việt', 0),
    ('"Phở" là món ăn nào?', '["Fried rice", "Spring rolls", "Noodle soup", "Salad"]', 2, 'Phở = Noodle soup, món ăn truyền thống Việt Nam', 1),
    ('Chọn từ đúng cho "Water"', '["Trà", "Cà phê", "Nước", "Sữa"]', 2, 'Water = Nước', 2)
) AS q(question, options, correct_index, explanation, order_index)
WHERE l.title = 'Thức ăn';

INSERT INTO public.questions (lesson_id, question, options, correct_index, explanation, order_index)
SELECT 
  l.id,
  q.question,
  q.options::jsonb,
  q.correct_index,
  q.explanation,
  q.order_index
FROM public.lessons l
CROSS JOIN LATERAL (
  VALUES
    ('"Một" là số mấy?', '["0", "1", "2", "3"]', 1, 'Một = 1', 0),
    ('Số "5" trong tiếng Việt là gì?', '["Ba", "Bốn", "Năm", "Sáu"]', 2, '5 = Năm', 1),
    ('"Mười" nghĩa là số bao nhiêu?', '["8", "9", "10", "11"]', 2, 'Mười = 10', 2)
) AS q(question, options, correct_index, explanation, order_index)
WHERE l.title = 'Số đếm';

INSERT INTO public.questions (lesson_id, question, options, correct_index, explanation, order_index)
SELECT 
  l.id,
  q.question,
  q.options::jsonb,
  q.correct_index,
  q.explanation,
  q.order_index
FROM public.lessons l
CROSS JOIN LATERAL (
  VALUES
    ('"Đỏ" là màu gì?', '["Blue", "Red", "Green", "Yellow"]', 1, 'Đỏ = Red', 0),
    ('Chọn từ tiếng Việt cho "Green"', '["Trắng", "Đen", "Xanh lá", "Vàng"]', 2, 'Green = Xanh lá', 1),
    ('"Trắng" nghĩa là gì?', '["Black", "White", "Gray", "Brown"]', 1, 'Trắng = White', 2)
) AS q(question, options, correct_index, explanation, order_index)
WHERE l.title = 'Màu sắc';

INSERT INTO public.questions (lesson_id, question, options, correct_index, explanation, order_index)
SELECT 
  l.id,
  q.question,
  q.options::jsonb,
  q.correct_index,
  q.explanation,
  q.order_index
FROM public.lessons l
CROSS JOIN LATERAL (
  VALUES
    ('"Chợ" là gì?', '["Park", "Market", "School", "Hospital"]', 1, 'Chợ = Market', 0),
    ('Chọn từ tiếng Việt cho "Restaurant"', '["Bệnh viện", "Nhà hàng", "Trường học", "Công viên"]', 1, 'Restaurant = Nhà hàng', 1),
    ('"Bao nhiêu tiền?" dùng khi nào?', '["Asking name", "Asking price", "Asking time", "Asking direction"]', 1, 'Bao nhiêu tiền? = How much? - hỏi giá', 2)
) AS q(question, options, correct_index, explanation, order_index)
WHERE l.title = 'Mua sắm';