import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { useIPASpeech } from "@/hooks/useIPASpeech";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Character {
  id: string;
  letter: string;
  type: 'vowel' | 'consonant';
  pronunciation: string;
  example: string;
  sound: string;
  order_index: number;
}

interface CharacterCardProps {
  item: Character;
  index: number;
  speak: (audioUrl: string | null, text: string) => void;
}

const CharacterCard = ({ item, index, speak }: CharacterCardProps) => {
  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Chỉ dùng Web Speech API cho từ ví dụ, không dùng URL âm thanh
    speak(null, item.example);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
    >
      <Card
        onClick={() => {
          // Chỉ phát âm ký tự IPA nếu admin đã thêm URL âm thanh
          if (item.sound && item.sound.trim()) {
            speak(item.sound, item.letter);
          }
        }}
        className={`group cursor-pointer p-3 text-center transition-all hover:scale-105 ${
          item.type === 'vowel'
            ? "border-2 border-red-300 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:hover:bg-red-900/50"
            : "border-2 border-blue-300 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-900/50"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-2xl font-bold font-mono whitespace-nowrap ${
              item.type === 'vowel' ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
            }`}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {item.letter}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSpeak}
            className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Volume2 className="size-4" />
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{item.pronunciation}</p>
        <p className="text-sm font-medium">{item.example}</p>
      </Card>
    </motion.div>
  );
};

const Alphabet = () => {
  const { speak } = useIPASpeech();

  // Fetch characters from database
  const { data: characters, isLoading } = useQuery({
    queryKey: ['characters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      
      if (error) throw error;
      return data as Character[];
    }
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const vowels = characters?.filter(char => char.type === 'vowel') || [];
  const consonants = characters?.filter(char => char.type === 'consonant') || [];

  return (
    <div className="py-6 space-y-8">
      <h1 className="mb-6 text-center text-2xl font-bold">Học phát âm</h1>

      {/* Vowels Section */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="size-4 rounded-full bg-red-500" />
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400">
            Nguyên âm (Vowels) - {vowels.length} chữ
          </h2>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {vowels.map((item, index) => (
            <CharacterCard
              key={item.id}
              item={item}
              index={index}
              speak={speak}
            />
          ))}
        </div>
      </div>

      {/* Consonants Section */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="size-4 rounded-full bg-blue-500" />
          <h2 className="text-lg font-bold text-blue-600 dark:text-blue-400">
            Phụ âm (Consonants) - {consonants.length} chữ
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {consonants.map((item, index) => (
            <CharacterCard
              key={item.id}
              item={item}
              index={index + vowels.length}
              speak={speak}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Ghi chú</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="size-4 rounded-full bg-red-500" />
            <span>Nguyên âm</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-4 rounded-full bg-blue-500" />
            <span>Phụ âm</span>
          </div>
        </div>
        <p className="mt-3 text-muted-foreground text-sm">
          💡 Nhấn vào chữ cái để nghe phát âm, hoặc nhấn icon loa để nghe từ ví dụ
        </p>
      </Card>
    </div>
  );
};

export default Alphabet;
