-- Add sample vocabulary distributed across different lessons
-- This migration adds basic English vocabulary with Vietnamese translations
-- Vocabulary is organized by topic and distributed across lessons

DO $$
DECLARE
    lesson_ids UUID[];
    lesson_count INTEGER;
BEGIN
    -- Get all active lesson IDs ordered by order_index
    SELECT ARRAY_AGG(id ORDER BY order_index) INTO lesson_ids
    FROM public.lessons 
    WHERE is_active = true;
    
    lesson_count := ARRAY_LENGTH(lesson_ids, 1);
    
    -- Only proceed if we have lessons
    IF lesson_count > 0 THEN
        
        -- LESSON 1: Basic Greetings & Introductions (10 words)
        INSERT INTO public.vocabulary (lesson_id, word, meaning, pronunciation, example, order_index, is_active) VALUES
        (lesson_ids[1], 'hello', 'xin chào', '/həˈloʊ/', 'Hello, how are you?', 1, true),
        (lesson_ids[1], 'goodbye', 'tạm biệt', '/ɡʊdˈbaɪ/', 'Goodbye, see you later!', 2, true),
        (lesson_ids[1], 'thank you', 'cảm ơn', '/θæŋk juː/', 'Thank you very much!', 3, true),
        (lesson_ids[1], 'please', 'làm ơn', '/pliːz/', 'Please help me.', 4, true),
        (lesson_ids[1], 'sorry', 'xin lỗi', '/ˈsɑːri/', 'I am sorry.', 5, true),
        (lesson_ids[1], 'yes', 'vâng', '/jes/', 'Yes, I agree.', 6, true),
        (lesson_ids[1], 'no', 'không', '/noʊ/', 'No, thank you.', 7, true),
        (lesson_ids[1], 'name', 'tên', '/neɪm/', 'My name is John.', 8, true),
        (lesson_ids[1], 'nice', 'vui', '/naɪs/', 'Nice to meet you!', 9, true),
        (lesson_ids[1], 'meet', 'gặp', '/miːt/', 'Nice to meet you!', 10, true);
        
        -- LESSON 2: Common Verbs (15 words)
        IF lesson_count >= 2 THEN
            INSERT INTO public.vocabulary (lesson_id, word, meaning, pronunciation, example, order_index, is_active) VALUES
            (lesson_ids[2], 'go', 'đi', '/ɡoʊ/', 'I go to school.', 1, true),
            (lesson_ids[2], 'come', 'đến', '/kʌm/', 'Come here!', 2, true),
            (lesson_ids[2], 'eat', 'ăn', '/iːt/', 'I eat breakfast.', 3, true),
            (lesson_ids[2], 'drink', 'uống', '/drɪŋk/', 'I drink water.', 4, true),
            (lesson_ids[2], 'sleep', 'ngủ', '/sliːp/', 'I sleep at night.', 5, true),
            (lesson_ids[2], 'work', 'làm việc', '/wɜːrk/', 'I work every day.', 6, true),
            (lesson_ids[2], 'study', 'học', '/ˈstʌdi/', 'I study English.', 7, true),
            (lesson_ids[2], 'read', 'đọc', '/riːd/', 'I read books.', 8, true),
            (lesson_ids[2], 'write', 'viết', '/raɪt/', 'I write a letter.', 9, true),
            (lesson_ids[2], 'speak', 'nói', '/spiːk/', 'I speak English.', 10, true),
            (lesson_ids[2], 'listen', 'nghe', '/ˈlɪsən/', 'I listen to music.', 11, true),
            (lesson_ids[2], 'watch', 'xem', '/wɑːtʃ/', 'I watch TV.', 12, true),
            (lesson_ids[2], 'play', 'chơi', '/pleɪ/', 'I play football.', 13, true),
            (lesson_ids[2], 'run', 'chạy', '/rʌn/', 'I run every morning.', 14, true),
            (lesson_ids[2], 'walk', 'đi bộ', '/wɔːk/', 'I walk to school.', 15, true);
        END IF;
        
        -- LESSON 3: Family (9 words)
        IF lesson_count >= 3 THEN
            INSERT INTO public.vocabulary (lesson_id, word, meaning, pronunciation, example, order_index, is_active) VALUES
            (lesson_ids[3], 'father', 'cha', '/ˈfɑːðər/', 'My father is tall.', 1, true),
            (lesson_ids[3], 'mother', 'mẹ', '/ˈmʌðər/', 'My mother is kind.', 2, true),
            (lesson_ids[3], 'brother', 'anh/em trai', '/ˈbrʌðər/', 'I have one brother.', 3, true),
            (lesson_ids[3], 'sister', 'chị/em gái', '/ˈsɪstər/', 'I have two sisters.', 4, true),
            (lesson_ids[3], 'family', 'gia đình', '/ˈfæməli/', 'I love my family.', 5, true),
            (lesson_ids[3], 'parent', 'cha mẹ', '/ˈperənt/', 'My parents are doctors.', 6, true),
            (lesson_ids[3], 'child', 'con', '/tʃaɪld/', 'I am their child.', 7, true),
            (lesson_ids[3], 'son', 'con trai', '/sʌn/', 'He is my son.', 8, true),
            (lesson_ids[3], 'daughter', 'con gái', '/ˈdɔːtər/', 'She is my daughter.', 9, true);
        END IF;
        
        -- LESSON 4: Numbers (10 words)
        IF lesson_count >= 4 THEN
            INSERT INTO public.vocabulary (lesson_id, word, meaning, pronunciation, example, order_index, is_active) VALUES
            (lesson_ids[4], 'one', 'một', '/wʌn/', 'I have one apple.', 1, true),
            (lesson_ids[4], 'two', 'hai', '/tuː/', 'I see two cats.', 2, true),
            (lesson_ids[4], 'three', 'ba', '/θriː/', 'There are three books.', 3, true),
            (lesson_ids[4], 'four', 'bốn', '/fɔːr/', 'I need four chairs.', 4, true),
            (lesson_ids[4], 'five', 'năm', '/faɪv/', 'Give me five minutes.', 5, true),
            (lesson_ids[4], 'six', 'sáu', '/sɪks/', 'I wake up at six.', 6, true),
            (lesson_ids[4], 'seven', 'bảy', '/ˈsevən/', 'Seven days a week.', 7, true),
            (lesson_ids[4], 'eight', 'tám', '/eɪt/', 'I have eight pencils.', 8, true),
            (lesson_ids[4], 'nine', 'chín', '/naɪn/', 'Nine plus one is ten.', 9, true),
            (lesson_ids[4], 'ten', 'mười', '/ten/', 'I count to ten.', 10, true);
        END IF;
        
        -- LESSON 5: Colors (10 words)
        IF lesson_count >= 5 THEN
            INSERT INTO public.vocabulary (lesson_id, word, meaning, pronunciation, example, order_index, is_active) VALUES
            (lesson_ids[5], 'red', 'đỏ', '/red/', 'The apple is red.', 1, true),
            (lesson_ids[5], 'blue', 'xanh dương', '/bluː/', 'The sky is blue.', 2, true),
            (lesson_ids[5], 'green', 'xanh lá', '/ɡriːn/', 'The grass is green.', 3, true),
            (lesson_ids[5], 'yellow', 'vàng', '/ˈjeloʊ/', 'The sun is yellow.', 4, true),
            (lesson_ids[5], 'black', 'đen', '/blæk/', 'I wear black shoes.', 5, true),
            (lesson_ids[5], 'white', 'trắng', '/waɪt/', 'Snow is white.', 6, true),
            (lesson_ids[5], 'orange', 'cam', '/ˈɔːrɪndʒ/', 'I like orange juice.', 7, true),
            (lesson_ids[5], 'pink', 'hồng', '/pɪŋk/', 'She wears a pink dress.', 8, true),
            (lesson_ids[5], 'purple', 'tím', '/ˈpɜːrpəl/', 'Purple is my favorite.', 9, true),
            (lesson_ids[5], 'brown', 'nâu', '/braʊn/', 'The dog is brown.', 10, true);
        END IF;
        
        -- LESSON 6: Food & Drink (12 words)
        IF lesson_count >= 6 THEN
            INSERT INTO public.vocabulary (lesson_id, word, meaning, pronunciation, example, order_index, is_active) VALUES
            (lesson_ids[6], 'water', 'nước', '/ˈwɔːtər/', 'I drink water.', 1, true),
            (lesson_ids[6], 'rice', 'cơm', '/raɪs/', 'I eat rice every day.', 2, true),
            (lesson_ids[6], 'bread', 'bánh mì', '/bred/', 'I have bread for breakfast.', 3, true),
            (lesson_ids[6], 'milk', 'sữa', '/mɪlk/', 'I drink milk.', 4, true),
            (lesson_ids[6], 'coffee', 'cà phê', '/ˈkɔːfi/', 'I like coffee.', 5, true),
            (lesson_ids[6], 'tea', 'trà', '/tiː/', 'Would you like tea?', 6, true),
            (lesson_ids[6], 'fruit', 'trái cây', '/fruːt/', 'I eat fruit daily.', 7, true),
            (lesson_ids[6], 'apple', 'táo', '/ˈæpəl/', 'An apple a day.', 8, true),
            (lesson_ids[6], 'banana', 'chuối', '/bəˈnænə/', 'I like bananas.', 9, true),
            (lesson_ids[6], 'chicken', 'gà', '/ˈtʃɪkɪn/', 'I eat chicken.', 10, true),
            (lesson_ids[6], 'fish', 'cá', '/fɪʃ/', 'Fish is healthy.', 11, true),
            (lesson_ids[6], 'egg', 'trứng', '/eɡ/', 'I eat eggs.', 12, true);
        END IF;
        
        -- LESSON 7 & beyond: Common Adjectives (14 words)
        IF lesson_count >= 7 THEN
            INSERT INTO public.vocabulary (lesson_id, word, meaning, pronunciation, example, order_index, is_active) VALUES
            (lesson_ids[7], 'good', 'tốt', '/ɡʊd/', 'This is good.', 1, true),
            (lesson_ids[7], 'bad', 'xấu', '/bæd/', 'That is bad.', 2, true),
            (lesson_ids[7], 'big', 'to', '/bɪɡ/', 'A big house.', 3, true),
            (lesson_ids[7], 'small', 'nhỏ', '/smɔːl/', 'A small car.', 4, true),
            (lesson_ids[7], 'hot', 'nóng', '/hɑːt/', 'The weather is hot.', 5, true),
            (lesson_ids[7], 'cold', 'lạnh', '/koʊld/', 'The water is cold.', 6, true),
            (lesson_ids[7], 'new', 'mới', '/nuː/', 'I have a new phone.', 7, true),
            (lesson_ids[7], 'old', 'cũ', '/oʊld/', 'This is an old book.', 8, true),
            (lesson_ids[7], 'happy', 'vui', '/ˈhæpi/', 'I am happy.', 9, true),
            (lesson_ids[7], 'sad', 'buồn', '/sæd/', 'She is sad.', 10, true),
            (lesson_ids[7], 'fast', 'nhanh', '/fæst/', 'He runs fast.', 11, true),
            (lesson_ids[7], 'slow', 'chậm', '/sloʊ/', 'The turtle is slow.', 12, true),
            (lesson_ids[7], 'beautiful', 'đẹp', '/ˈbjuːtɪfəl/', 'She is beautiful.', 13, true),
            (lesson_ids[7], 'ugly', 'xấu', '/ˈʌɡli/', 'The monster is ugly.', 14, true);
        END IF;
        
        -- LESSON 8 & beyond: Time (12 words)
        IF lesson_count >= 8 THEN
            INSERT INTO public.vocabulary (lesson_id, word, meaning, pronunciation, example, order_index, is_active) VALUES
            (lesson_ids[8], 'today', 'hôm nay', '/təˈdeɪ/', 'Today is Monday.', 1, true),
            (lesson_ids[8], 'tomorrow', 'ngày mai', '/təˈmɑːroʊ/', 'See you tomorrow.', 2, true),
            (lesson_ids[8], 'yesterday', 'hôm qua', '/ˈjestərdeɪ/', 'Yesterday was Sunday.', 3, true),
            (lesson_ids[8], 'now', 'bây giờ', '/naʊ/', 'I am busy now.', 4, true),
            (lesson_ids[8], 'morning', 'buổi sáng', '/ˈmɔːrnɪŋ/', 'Good morning!', 5, true),
            (lesson_ids[8], 'afternoon', 'buổi chiều', '/ˌæftərˈnuːn/', 'Good afternoon!', 6, true),
            (lesson_ids[8], 'evening', 'buổi tối', '/ˈiːvnɪŋ/', 'Good evening!', 7, true),
            (lesson_ids[8], 'night', 'đêm', '/naɪt/', 'Good night!', 8, true),
            (lesson_ids[8], 'day', 'ngày', '/deɪ/', 'Have a nice day!', 9, true),
            (lesson_ids[8], 'week', 'tuần', '/wiːk/', 'See you next week.', 10, true),
            (lesson_ids[8], 'month', 'tháng', '/mʌnθ/', 'This month is January.', 11, true),
            (lesson_ids[8], 'year', 'năm', '/jɪr/', 'Happy new year!', 12, true);
        END IF;
        
        -- LESSON 9 & beyond: Places (8 words)
        IF lesson_count >= 9 THEN
            INSERT INTO public.vocabulary (lesson_id, word, meaning, pronunciation, example, order_index, is_active) VALUES
            (lesson_ids[9], 'home', 'nhà', '/hoʊm/', 'I am at home.', 1, true),
            (lesson_ids[9], 'school', 'trường học', '/skuːl/', 'I go to school.', 2, true),
            (lesson_ids[9], 'office', 'văn phòng', '/ˈɔːfɪs/', 'I work in an office.', 3, true),
            (lesson_ids[9], 'hospital', 'bệnh viện', '/ˈhɑːspɪtl/', 'He is in the hospital.', 4, true),
            (lesson_ids[9], 'restaurant', 'nhà hàng', '/ˈrestrɑːnt/', 'We eat at a restaurant.', 5, true),
            (lesson_ids[9], 'store', 'cửa hàng', '/stɔːr/', 'I shop at the store.', 6, true),
            (lesson_ids[9], 'park', 'công viên', '/pɑːrk/', 'We play in the park.', 7, true),
            (lesson_ids[9], 'street', 'đường phố', '/striːt/', 'Walk on the street.', 8, true);
        END IF;
        
    END IF;
END $$;
