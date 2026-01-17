import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Volume2, 
  Shuffle, 
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface VocabularyWord {
  id: string;
  word: string;
  meaning: string;
  pronunciation: string | null;
  example: string | null;
  order_index: number;
}

const Flashcards = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { speak } = useSpeech();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<string>>(new Set());
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  // Fetch lesson details
  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, units(title)")
        .eq("id", lessonId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  // Fetch vocabulary for lesson
  const { data: vocabulary, isLoading: vocabLoading } = useQuery({
    queryKey: ["vocabulary", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocabulary")
        .select("*")
        .eq("lesson_id", lessonId)
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data as VocabularyWord[];
    },
    enabled: !!lessonId,
  });

  const isLoading = lessonLoading || vocabLoading;
  const cards = vocabulary || [];

  // Initialize shuffled indices
  useEffect(() => {
    if (cards.length > 0 && shuffledIndices.length === 0) {
      setShuffledIndices(cards.map((_, i) => i));
    }
  }, [cards, shuffledIndices.length]);

  const currentCardIndex = shuffledIndices[currentIndex] ?? 0;
  const currentCard = cards[currentCardIndex];
  const totalCards = cards.length;
  const progress = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleSpeak = (text: string) => {
    speak(text);
  };

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleKnown = () => {
    if (currentCard) {
      setKnownCards(new Set(knownCards).add(currentCard.id));
      unknownCards.delete(currentCard.id);
      setUnknownCards(new Set(unknownCards));
    }
    handleNext();
  };

  const handleUnknown = () => {
    if (currentCard) {
      setUnknownCards(new Set(unknownCards).add(currentCard.id));
      knownCards.delete(currentCard.id);
      setKnownCards(new Set(knownCards));
    }
    handleNext();
  };

  const handleShuffle = () => {
    const newIndices = [...shuffledIndices].sort(() => Math.random() - 0.5);
    setShuffledIndices(newIndices);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setUnknownCards(new Set());
    setShuffledIndices(cards.map((_, i) => i));
  };

  const handleStartLesson = () => {
    navigate(`/lesson/${lessonId}`);
  };

  const handleBack = () => {
    navigate("/learn");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!vocabulary || vocabulary.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="max-w-md p-6 text-center">
          <BookOpen className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-bold">Chưa có từ vựng</h2>
          <p className="mb-4 text-muted-foreground">
            Bài học này chưa có từ vựng nào. Bạn có thể bắt đầu làm bài ngay!
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 size-4" />
              Quay lại
            </Button>
            <Button onClick={handleStartLesson}>
              Bắt đầu bài học
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isCompleted = currentIndex >= totalCards - 1 && (knownCards.has(currentCard?.id || "") || unknownCards.has(currentCard?.id || ""));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 bg-background/95 backdrop-blur px-4 py-3 border-b">
        <div className="mx-auto flex max-w-lg items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-sm truncate">{lesson?.title}</h1>
            <p className="text-xs text-muted-foreground">
              {(lesson as any)?.units?.title} • Flashcard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleShuffle}>
              <Shuffle className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="fixed left-0 right-0 top-[57px] z-40 bg-background px-4 py-2">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">
              {currentIndex + 1} / {totalCards}
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="size-4" />
                {knownCards.size}
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="size-4" />
                {unknownCards.size}
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-lg px-4 pb-32 pt-28">
        {isCompleted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <Card className="p-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">Hoàn thành!</h2>
              <p className="text-muted-foreground mb-6">
                Bạn đã xem hết {totalCards} từ vựng
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="p-4 bg-green-500/10 border-green-500/30">
                  <CheckCircle2 className="size-8 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold text-green-600">{knownCards.size}</p>
                  <p className="text-sm text-muted-foreground">Đã thuộc</p>
                </Card>
                <Card className="p-4 bg-destructive/10 border-destructive/30">
                  <XCircle className="size-8 mx-auto mb-2 text-destructive" />
                  <p className="text-2xl font-bold text-destructive">{unknownCards.size}</p>
                  <p className="text-sm text-muted-foreground">Cần ôn lại</p>
                </Card>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={handleStartLesson} size="lg" className="w-full">
                  Bắt đầu bài kiểm tra
                </Button>
                <Button variant="outline" onClick={handleReset} className="w-full">
                  Học lại từ đầu
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* Flashcard */}
            <div 
              className="perspective-1000 cursor-pointer mb-6" 
              onClick={handleFlip}
              style={{ perspective: "1000px" }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentCardIndex}-${isFlipped}`}
                  initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Card className={cn(
                    "min-h-[280px] p-6 flex flex-col items-center justify-center text-center relative",
                    "border-2 transition-all",
                    isFlipped 
                      ? "bg-primary/5 border-primary/30" 
                      : "bg-card border-border",
                    knownCards.has(currentCard?.id || "") && "border-green-500/50",
                    unknownCards.has(currentCard?.id || "") && "border-destructive/50"
                  )}>
                    {!isFlipped ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-4 right-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpeak(currentCard?.word || "");
                          }}
                        >
                          <Volume2 className="size-5" />
                        </Button>
                        <p className="text-4xl font-bold mb-2">{currentCard?.word}</p>
                        {currentCard?.pronunciation && (
                          <p className="text-lg text-muted-foreground">
                            {currentCard.pronunciation}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-4">
                          Nhấn để xem nghĩa
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-primary mb-3">
                          {currentCard?.meaning}
                        </p>
                        <p className="text-xl text-muted-foreground mb-2">
                          {currentCard?.word}
                        </p>
                        {currentCard?.example && (
                          <div className="mt-4 p-3 bg-muted rounded-lg w-full">
                            <p className="text-sm text-muted-foreground">Ví dụ:</p>
                            <p className="text-sm font-medium">{currentCard.example}</p>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button
                variant="outline"
                size="lg"
                onClick={handleUnknown}
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="mr-2 size-5" />
                Chưa thuộc
              </Button>
              <Button
                size="lg"
                onClick={handleKnown}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="mr-2 size-5" />
                Đã thuộc
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="size-6" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Vuốt hoặc nhấn để điều hướng
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={currentIndex >= totalCards - 1}
              >
                <ChevronRight className="size-6" />
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Flashcards;
