import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, BookOpen, Volume2, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
}

interface Unit {
  id: string;
  title: string;
  order_index: number;
}

interface UnitGuideProps {
  unitTitle: string;
  unitDescription: string | null;
  lessons: Lesson[];
  unitId?: string;
  unitOrderIndex?: number;
}

interface VocabularyWord {
  id: string;
  word: string;
  meaning: string;
  pronunciation: string | null;
  lesson_id: string;
}

const UnitGuide = ({ unitTitle, unitDescription, lessons, unitId, unitOrderIndex = 1 }: UnitGuideProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { speak } = useSpeech();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch all units for the dropdown
  const { data: allUnits = [] } = useQuery({
    queryKey: ["all-units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, title, order_index")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data as Unit[];
    },
  });

  // Fetch all lessons for selected unit
  const [selectedUnitId, setSelectedUnitId] = useState<string>(unitId || "");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");

  // Fetch lessons for selected unit
  const { data: unitLessons = [] } = useQuery({
    queryKey: ["unit-lessons", selectedUnitId],
    queryFn: async () => {
      if (!selectedUnitId) return [];
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, order_index")
        .eq("unit_id", selectedUnitId)
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUnitId,
  });

  // Fetch user progress to determine last completed lesson
  const { data: userProgress = [] } = useQuery({
    queryKey: ["user-progress-for-flashcard", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_progress")
        .select("lesson_id, completed_at")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Set default unit and lesson based on last completed
  useEffect(() => {
    if (allUnits.length > 0 && !selectedUnitId) {
      // Find the unit containing the last completed lesson
      if (userProgress.length > 0 && unitLessons.length > 0) {
        const lastCompletedLessonId = userProgress[0]?.lesson_id;
        // Check if it's in current unit's lessons
        const isInCurrentUnit = lessons.some(l => l.id === lastCompletedLessonId);
        if (isInCurrentUnit) {
          setSelectedUnitId(unitId || allUnits[0].id);
          setSelectedLessonId(lastCompletedLessonId);
          return;
        }
      }
      // Default to current unit
      setSelectedUnitId(unitId || allUnits[0].id);
    }
  }, [allUnits, unitId, userProgress, lessons]);

  // Set default lesson when unit changes or when lessons load
  useEffect(() => {
    if (unitLessons.length > 0 && selectedUnitId) {
      // Find last completed lesson in this unit
      const completedInUnit = userProgress.filter(p => 
        unitLessons.some(l => l.id === p.lesson_id)
      );
      
      if (completedInUnit.length > 0) {
        setSelectedLessonId(completedInUnit[0].lesson_id);
      } else {
        // Default to first lesson
        setSelectedLessonId(unitLessons[0].id);
      }
    }
  }, [unitLessons, selectedUnitId, userProgress]);

  // Get all lesson IDs in this unit for vocabulary display
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

  const handleStartFlashcard = () => {
    if (selectedLessonId) {
      navigate(`/lesson/${selectedLessonId}/flashcards`);
    }
  };

  const selectedUnit = allUnits.find(u => u.id === selectedUnitId);
  const selectedLesson = unitLessons.find(l => l.id === selectedLessonId);

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
                {/* Flashcard Selection */}
                <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Play className="size-4 text-primary" />
                    Học từ vựng với Flashcard
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Chọn chương</label>
                      <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn chương" />
                        </SelectTrigger>
                        <SelectContent>
                          {allUnits.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              Chương {unit.order_index}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Chọn bài</label>
                      <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn bài" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitLessons.map((lesson, idx) => (
                            <SelectItem key={lesson.id} value={lesson.id}>
                              {idx + 1}. {lesson.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleStartFlashcard} 
                    className="w-full"
                    disabled={!selectedLessonId}
                  >
                    <Play className="size-4 mr-2" />
                    Bắt đầu Flashcard
                  </Button>
                </div>

                {/* Summary */}
                <div className="mt-2 pt-3 border-t flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    💡 Học từ vựng trước khi làm bài kiểm tra
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