import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";

const vowels = [
  { letter: "A", pronunciation: "/eɪ/", example: "Apple", sound: "A" },
  { letter: "E", pronunciation: "/iː/", example: "Elephant", sound: "E" },
  { letter: "I", pronunciation: "/aɪ/", example: "Ice", sound: "I" },
  { letter: "O", pronunciation: "/oʊ/", example: "Orange", sound: "O" },
  { letter: "U", pronunciation: "/juː/", example: "Umbrella", sound: "U" },
];

const consonants = [
  { letter: "B", pronunciation: "/biː/", example: "Ball", sound: "B" },
  { letter: "C", pronunciation: "/siː/", example: "Cat", sound: "C" },
  { letter: "D", pronunciation: "/diː/", example: "Dog", sound: "D" },
  { letter: "F", pronunciation: "/ef/", example: "Fish", sound: "F" },
  { letter: "G", pronunciation: "/dʒiː/", example: "Girl", sound: "G" },
  { letter: "H", pronunciation: "/eɪtʃ/", example: "House", sound: "H" },
  { letter: "J", pronunciation: "/dʒeɪ/", example: "Juice", sound: "J" },
  { letter: "K", pronunciation: "/keɪ/", example: "Kite", sound: "K" },
  { letter: "L", pronunciation: "/el/", example: "Lion", sound: "L" },
  { letter: "M", pronunciation: "/em/", example: "Moon", sound: "M" },
  { letter: "N", pronunciation: "/en/", example: "Nose", sound: "N" },
  { letter: "P", pronunciation: "/piː/", example: "Pen", sound: "P" },
  { letter: "Q", pronunciation: "/kjuː/", example: "Queen", sound: "Q" },
  { letter: "R", pronunciation: "/ɑːr/", example: "Rain", sound: "R" },
  { letter: "S", pronunciation: "/es/", example: "Sun", sound: "S" },
  { letter: "T", pronunciation: "/tiː/", example: "Tree", sound: "T" },
  { letter: "V", pronunciation: "/viː/", example: "Violin", sound: "V" },
  { letter: "W", pronunciation: "/ˈdʌbəljuː/", example: "Water", sound: "W" },
  { letter: "X", pronunciation: "/eks/", example: "X-ray", sound: "X" },
  { letter: "Y", pronunciation: "/waɪ/", example: "Yellow", sound: "Y" },
  { letter: "Z", pronunciation: "/ziː/", example: "Zebra", sound: "Z" },
];

interface LetterCardProps {
  item: { letter: string; pronunciation: string; example: string; sound: string };
  index: number;
  isVowel?: boolean;
  speak: (text: string) => void;
}

const LetterCard = ({ item, index, isVowel, speak }: LetterCardProps) => {
  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    speak(item.example);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
    >
      <Card
        onClick={() => speak(item.letter)}
        className={`group cursor-pointer p-3 text-center transition-all hover:scale-105 ${
          isVowel
            ? "border-2 border-red-300 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:hover:bg-red-900/50"
            : "border-2 border-blue-300 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-900/50"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-3xl font-black ${
              isVowel ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
            }`}
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
  const { speak } = useSpeech();

  return (
    <div className="py-6 space-y-8">
      <h1 className="mb-6 text-center text-2xl font-bold">Bảng chữ cái</h1>

      {/* Vowels Section */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="size-4 rounded-full bg-red-500" />
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400">
            Nguyên âm (Vowels) - 5 chữ
          </h2>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {vowels.map((item, index) => (
            <LetterCard key={item.letter} item={item} index={index} isVowel speak={speak} />
          ))}
        </div>
      </div>

      {/* Consonants Section */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="size-4 rounded-full bg-blue-500" />
          <h2 className="text-lg font-bold text-blue-600 dark:text-blue-400">
            Phụ âm (Consonants) - 21 chữ
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
          {consonants.map((item, index) => (
            <LetterCard key={item.letter} item={item} index={index + 5} speak={speak} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Ghi chú</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="size-4 rounded-full bg-red-500" />
            <span>Nguyên âm (A, E, I, O, U)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-4 rounded-full bg-blue-500" />
            <span>Phụ âm (21 chữ còn lại)</span>
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
