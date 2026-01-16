import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, BookOpen, Volume2 } from "lucide-react";
import { useState } from "react";
import { useSpeech } from "@/hooks/useSpeech";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
}

interface UnitGuideProps {
  unitTitle: string;
  unitDescription: string | null;
  lessons: Lesson[];
}

// Sample vocabulary data - in real app, this would come from database
const unitVocabulary: Record<string, { word: string; meaning: string; pronunciation: string }[]> = {
  "Đơn vị 1": [
    { word: "Hello", meaning: "Xin chào", pronunciation: "/həˈloʊ/" },
    { word: "Goodbye", meaning: "Tạm biệt", pronunciation: "/ˌɡʊdˈbaɪ/" },
    { word: "Thank you", meaning: "Cảm ơn", pronunciation: "/θæŋk juː/" },
    { word: "Please", meaning: "Làm ơn", pronunciation: "/pliːz/" },
    { word: "Yes", meaning: "Vâng/Có", pronunciation: "/jes/" },
    { word: "No", meaning: "Không", pronunciation: "/noʊ/" },
    { word: "Sorry", meaning: "Xin lỗi", pronunciation: "/ˈsɑːri/" },
    { word: "Excuse me", meaning: "Xin phép", pronunciation: "/ɪkˈskjuːz miː/" },
  ],
  "Đơn vị 2": [
    { word: "I", meaning: "Tôi", pronunciation: "/aɪ/" },
    { word: "You", meaning: "Bạn", pronunciation: "/juː/" },
    { word: "He", meaning: "Anh ấy", pronunciation: "/hiː/" },
    { word: "She", meaning: "Cô ấy", pronunciation: "/ʃiː/" },
    { word: "We", meaning: "Chúng tôi", pronunciation: "/wiː/" },
    { word: "They", meaning: "Họ", pronunciation: "/ðeɪ/" },
    { word: "It", meaning: "Nó", pronunciation: "/ɪt/" },
  ],
};

const defaultVocabulary = [
  { word: "Apple", meaning: "Quả táo", pronunciation: "/ˈæp.əl/" },
  { word: "Book", meaning: "Quyển sách", pronunciation: "/bʊk/" },
  { word: "Cat", meaning: "Con mèo", pronunciation: "/kæt/" },
  { word: "Dog", meaning: "Con chó", pronunciation: "/dɔːɡ/" },
  { word: "House", meaning: "Ngôi nhà", pronunciation: "/haʊs/" },
  { word: "Water", meaning: "Nước", pronunciation: "/ˈwɔː.tər/" },
];

const UnitGuide = ({ unitTitle, unitDescription, lessons }: UnitGuideProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { speak } = useSpeech();

  const vocabulary = unitVocabulary[unitTitle] || defaultVocabulary;
  const totalXP = lessons.reduce((acc, l) => acc + l.xp_reward, 0);

  return (
    <div className="mb-3">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between gap-2 border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 h-auto py-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/20">
            <BookOpen className="size-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-primary">Từ vựng trong đơn vị</p>
            <p className="text-xs text-muted-foreground">
              {vocabulary.length} từ vựng • {lessons.length} bài học
            </p>
          </div>
        </div>
        <ChevronDown
          className={`size-5 text-primary transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card className="mt-2 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Từ vựng sẽ học</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {vocabulary.length} từ
                  </span>
                </div>

                {/* Vocabulary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {vocabulary.map((item, index) => (
                    <motion.div
                      key={item.word}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 rounded-lg bg-background/80 p-3 border hover:border-primary/50 transition-colors group"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => speak(item.word)}
                        className="size-8 shrink-0 opacity-60 group-hover:opacity-100 hover:bg-primary/20"
                      >
                        <Volume2 className="size-4 text-primary" />
                      </Button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-primary">{item.word}</span>
                          <span className="text-xs text-muted-foreground">{item.pronunciation}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.meaning}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    💡 Nhấn vào icon loa để nghe phát âm
                  </span>
                  <span className="font-medium text-primary">+{totalXP} XP</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnitGuide;
