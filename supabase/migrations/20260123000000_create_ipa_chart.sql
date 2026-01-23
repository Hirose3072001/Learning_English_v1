-- Create characters table for IPA Chart
CREATE TABLE public.characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    letter TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('vowel', 'consonant')),
    pronunciation TEXT NOT NULL,
    example TEXT NOT NULL,
    sound TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert IPA Chart data
INSERT INTO public.characters (letter, type, pronunciation, example, sound, order_index) VALUES
-- Vowels (12)
('/i:/', 'vowel', '/i:/', 'eat', '/i:/', 1),
('/ɪ/', 'vowel', '/ɪ/', 'sit', '/ɪ/', 2),
('/ʊ/', 'vowel', '/ʊ/', 'good', '/ʊ/', 3),
('/u:/', 'vowel', '/u:/', 'food', '/u:/', 4),
('/e/', 'vowel', '/e/', 'pen', '/e/', 5),
('/ə/', 'vowel', '/ə/', 'teacher', '/ə/', 6),
('/ɜ:/', 'vowel', '/ɜ:/', 'nurse', '/ɜ:/', 7),
('/ɔ:/', 'vowel', '/ɔ:/', 'door', '/ɔ:/', 8),
('/æ/', 'vowel', '/æ/', 'map', '/æ/', 9),
('/ʌ/', 'vowel', '/ʌ/', 'cup', '/ʌ/', 10),
('/ɑ:/', 'vowel', '/ɑ:/', 'car', '/ɑ:/', 11),
('/ɒ/', 'vowel', '/ɒ/', 'box', '/ɒ/', 12),
-- Consonants (16)
('/p/', 'consonant', '/p/', 'pen', '/p/', 13),
('/b/', 'consonant', '/b/', 'ball', '/b/', 14),
('/t/', 'consonant', '/t/', 'tea', '/t/', 15),
('/d/', 'consonant', '/d/', 'dog', '/d/', 16),
('/k/', 'consonant', '/k/', 'cat', '/k/', 17),
('/g/', 'consonant', '/g/', 'go', '/g/', 18),
('/f/', 'consonant', '/f/', 'fan', '/f/', 19),
('/v/', 'consonant', '/v/', 'van', '/v/', 20),
('/s/', 'consonant', '/s/', 'sun', '/s/', 21),
('/z/', 'consonant', '/z/', 'zoo', '/z/', 22),
('/h/', 'consonant', '/h/', 'hat', '/h/', 23),
('/m/', 'consonant', '/m/', 'man', '/m/', 24),
('/n/', 'consonant', '/n/', 'now', '/n/', 25),
('/l/', 'consonant', '/l/', 'leg', '/l/', 26),
('/r/', 'consonant', '/r/', 'red', '/r/', 27),
('/w/', 'consonant', '/w/', 'wet', '/w/', 28);

-- Enable RLS
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read
CREATE POLICY "Characters are viewable by everyone" ON public.characters
    FOR SELECT USING (true);

-- Create policy for admin users to modify
CREATE POLICY "Admins can modify characters" ON public.characters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
