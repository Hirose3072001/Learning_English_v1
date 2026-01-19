import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, BookOpen, Volume2 } from "lucide-react";
import { useState } from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

interface VocabularyWord {
  id: string;
  word: string;
  meaning: string;
  pronunciation: string | null;
  lesson_id: string;
}

const UnitGuide = ({ unitTitle, unitDescription, lessons }: UnitGuideProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { speak } = useSpeech();

  // Get all lesson IDs in this unit
  const lessonIds = lessons.map((l) => l.id);

  // Fetch vocabulary for all lessons in this unit
  const { data: vocabulary = [] } = useQuery({
    queryKey: ["unit-vocabulary", lessonIds],
    queryFn: async () => {
      if (lessonIds.length === 0) return [];
      const { data, error } = await supabase
        .from("vocabulary")
        .select("*")
        .in("lesson_id", lessonIds)
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data as VocabularyWord[];
    },
    enabled: lessonIds.length > 0,
  });

  const totalXP = lessons.reduce((acc, l) => acc + l.xp_reward, 0);

  // Group vocabulary by lesson
  const vocabByLesson = lessons.map((lesson) => ({
    lesson,
    words: vocabulary.filter((v) => v.lesson_id === lesson.id),
  }));

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
            <p className="font-semibold text-primary">Từ vựng trong chương</p>
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
                {vocabByLesson.map(({ lesson, words }, lessonIndex) => (
                  <div key={lesson.id} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">{lessonIndex + 1}. {lesson.title}</h3>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {words.length} từ
                      </span>
                    </div>

                    {words.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {words.map((item, index) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
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
                                {item.pronunciation && (
                                  <span className="text-xs text-muted-foreground">
                                    {item.pronunciation}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{item.meaning}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Chưa có từ vựng
                      </p>
                    )}
                  </div>
                ))}

                {vocabulary.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Đơn vị này chưa có từ vựng nào
                  </p>
                )}

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
