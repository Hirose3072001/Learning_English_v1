import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  RotateCcw,
  Check,
  X,
  Shuffle,
  BookOpen,
} from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import { cn } from "@/lib/utils";

interface VocabularyWord {
  word: string;
  meaning: string;
  pronunciation: string;
  example?: string;
}

const unit1Vocabulary: VocabularyWord[] = [
  { word: "Hello", meaning: "Xin chào", pronunciation: "/həˈloʊ/", example: "Hello, how are you?" },
  { word: "Goodbye", meaning: "Tạm biệt", pronunciation: "/ˌɡʊdˈbaɪ/", example: "Goodbye, see you later!" },
  { word: "Thank you", meaning: "Cảm ơn", pronunciation: "/θæŋk juː/", example: "Thank you very much!" },
  { word: "Please", meaning: "Làm ơn", pronunciation: "/pliːz/", example: "Please help me." },
  { word: "Yes", meaning: "Vâng/Có", pronunciation: "/jes/", example: "Yes, I understand." },
  { word: "No", meaning: "Không", pronunciation: "/noʊ/", example: "No, thank you." },
  { word: "Sorry", meaning: "Xin lỗi", pronunciation: "/ˈsɑːri/", example: "Sorry, I'm late." },
  { word: "Excuse me", meaning: "Xin phép", pronunciation: "/ɪkˈskjuːz miː/", example: "Excuse me, where is the station?" },
];

const Flashcards = () => {
  const { speak } = useSpeech();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<number>>(new Set());
  const [cards, setCards] = useState(unit1Vocabulary);

  const currentCard = cards[currentIndex];
  const progress = ((knownCards.size + unknownCards.size) / cards.length) * 100;

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKnown = () => {
    setKnownCards((prev) => new Set([...prev, currentIndex]));
    setUnknownCards((prev) => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });
    handleNext();
  };

  const handleUnknown = () => {
    setUnknownCards((prev) => new Set([...prev, currentIndex]));
    setKnownCards((prev) => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });
    handleNext();
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setUnknownCards(new Set());
  };

  const handleReset = () => {
    setCards(unit1Vocabulary);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setUnknownCards(new Set());
  };

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-3">
          <BookOpen className="size-4" />
          <span className="text-sm font-medium">Đơn vị 1 - Cơ bản</span>
        </div>
        <h1 className="text-2xl font-bold">Flashcard Từ vựng</h1>
        <p className="text-muted-foreground mt-1">
          {cards.length} từ vựng • Nhấn vào thẻ để lật
        </p>
      </div>

      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-muted-foreground">Tiến độ</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-green-600">
              <Check className="size-4" /> {knownCards.size} đã biết
            </span>
            <span className="flex items-center gap-1 text-red-500">
              <X className="size-4" /> {unknownCards.size} cần ôn
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </Card>

      {/* Card Counter */}
      <div className="text-center text-sm text-muted-foreground">
        Thẻ {currentIndex + 1} / {cards.length}
      </div>

      {/* Flashcard */}
      <div className="perspective-1000 mx-auto max-w-sm">
        <motion.div
          className="relative cursor-pointer"
          onClick={handleFlip}
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          {/* Front Side */}
          <Card
            className={cn(
              "h-64 flex flex-col items-center justify-center p-6 backface-hidden",
              "bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20",
              knownCards.has(currentIndex) && "border-green-500/50 from-green-500/10",
              unknownCards.has(currentIndex) && "border-red-500/50 from-red-500/10"
            )}
            style={{ backfaceVisibility: "hidden" }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                speak(currentCard.word);
              }}
              className="absolute top-4 right-4"
            >
              <Volume2 className="size-5" />
            </Button>

            <motion.div
              key={`front-${currentIndex}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <p className="text-3xl font-bold text-primary mb-2">{currentCard.word}</p>
              <p className="text-sm text-muted-foreground">{currentCard.pronunciation}</p>
            </motion.div>

            <p className="absolute bottom-4 text-xs text-muted-foreground">
              Nhấn để xem nghĩa
            </p>
          </Card>

          {/* Back Side */}
          <Card
            className={cn(
              "h-64 flex flex-col items-center justify-center p-6 absolute inset-0",
              "bg-gradient-to-br from-secondary/50 to-secondary/30 border-2 border-secondary"
            )}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                speak(currentCard.example || currentCard.word);
              }}
              className="absolute top-4 right-4"
            >
              <Volume2 className="size-5" />
            </Button>

            <motion.div
              key={`back-${currentIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="text-2xl font-bold mb-2">{currentCard.meaning}</p>
              {currentCard.example && (
                <div className="mt-4 p-3 bg-background/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Ví dụ:</p>
                  <p className="text-sm font-medium italic">"{currentCard.example}"</p>
                </div>
              )}
            </motion.div>

            <p className="absolute bottom-4 text-xs text-muted-foreground">
              Nhấn để xem từ
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={handlePrev}>
          <ChevronLeft className="size-5" />
        </Button>

        <Button
          variant="outline"
          onClick={handleUnknown}
          className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
        >
          <X className="size-4 mr-2" />
          Chưa biết
        </Button>

        <Button
          onClick={handleKnown}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Check className="size-4 mr-2" />
          Đã biết
        </Button>

        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronRight className="size-5" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" onClick={handleShuffle} className="text-muted-foreground">
          <Shuffle className="size-4 mr-2" />
          Xáo trộn
        </Button>
        <Button variant="ghost" onClick={handleReset} className="text-muted-foreground">
          <RotateCcw className="size-4 mr-2" />
          Làm lại
        </Button>
      </div>

      {/* Completion Message */}
      <AnimatePresence>
        {knownCards.size + unknownCards.size === cards.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-6 text-center bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
              <h3 className="text-lg font-bold mb-2">🎉 Hoàn thành!</h3>
              <p className="text-muted-foreground mb-4">
                Bạn đã ôn tập hết {cards.length} từ vựng.
                {unknownCards.size > 0 && (
                  <span className="block mt-1">
                    Còn {unknownCards.size} từ cần ôn lại.
                  </span>
                )}
              </p>
              <Button onClick={handleReset}>Học lại từ đầu</Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Flashcards;
