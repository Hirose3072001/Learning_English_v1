import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { X, Heart, CheckCircle2, XCircle, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Sample questions for lessons (in real app, these would come from database)
const lessonQuestions: Record<string, Question[]> = {
  "Xin chào": [
    {
      type: "multiple-choice",
      question: "\"Xin chào\" nghĩa là gì?",
      options: ["Goodbye", "Hello", "Thank you", "Sorry"],
      correctIndex: 1,
    },
    {
      type: "multiple-choice", 
      question: "Chọn cách nói \"Hello\" trong tiếng Việt",
      options: ["Tạm biệt", "Cảm ơn", "Xin chào", "Xin lỗi"],
      correctIndex: 2,
    },
    {
      type: "multiple-choice",
      question: "\"Tạm biệt\" nghĩa là gì?",
      options: ["Hello", "Goodbye", "Please", "Thanks"],
      correctIndex: 1,
    },
  ],
  "Gia đình": [
    {
      type: "multiple-choice",
      question: "\"Mẹ\" nghĩa là gì?",
      options: ["Father", "Mother", "Brother", "Sister"],
      correctIndex: 1,
    },
    {
      type: "multiple-choice",
      question: "\"Bố\" là ai trong gia đình?",
      options: ["Mother", "Sister", "Father", "Brother"],
      correctIndex: 2,
    },
    {
      type: "multiple-choice",
      question: "Chọn từ đúng cho \"Sister\"",
      options: ["Anh", "Em gái", "Mẹ", "Bố"],
      correctIndex: 1,
    },
  ],
  "Thức ăn": [
    {
      type: "multiple-choice",
      question: "\"Cơm\" là gì?",
      options: ["Bread", "Rice", "Noodles", "Soup"],
      correctIndex: 1,
    },
    {
      type: "multiple-choice",
      question: "\"Phở\" là món ăn nào?",
      options: ["Fried rice", "Spring rolls", "Noodle soup", "Salad"],
      correctIndex: 2,
    },
    {
      type: "multiple-choice",
      question: "Chọn từ đúng cho \"Water\"",
      options: ["Trà", "Cà phê", "Nước", "Sữa"],
      correctIndex: 2,
    },
  ],
};

// Default questions for lessons without specific content
const defaultQuestions: Question[] = [
  {
    type: "multiple-choice",
    question: "Đây là câu hỏi mẫu 1",
    options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    correctIndex: 0,
  },
  {
    type: "multiple-choice",
    question: "Đây là câu hỏi mẫu 2",
    options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    correctIndex: 1,
  },
  {
    type: "multiple-choice",
    question: "Đây là câu hỏi mẫu 3",
    options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    correctIndex: 2,
  },
];

interface Question {
  type: "multiple-choice";
  question: string;
  options: string[];
  correctIndex: number;
}

const Lesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hearts, setHearts] = useState(5);
  const [correctCount, setCorrectCount] = useState(0);

  // Fetch lesson details
  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  const questions = lesson ? (lessonQuestions[lesson.title] || defaultQuestions) : defaultQuestions;
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / questions.length) * 100;

  const handleSelectAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
  };

  const handleCheckAnswer = () => {
    if (selectedAnswer === null) return;

    const correct = selectedAnswer === currentQuestion.correctIndex;
    setIsCorrect(correct);
    setIsAnswered(true);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setHearts((prev) => prev - 1);
    }
  };

  const handleContinue = async () => {
    if (hearts <= 0) {
      toast.error("Hết tim! Thử lại sau nhé.");
      navigate("/learn");
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(false);
    } else {
      // Lesson completed!
      if (user && lesson) {
        const { error } = await supabase.from("user_progress").insert({
          user_id: user.id,
          lesson_id: lesson.id,
          completed: true,
          completed_at: new Date().toISOString(),
          score: Math.round((correctCount / questions.length) * 100),
        });

        if (error) {
          console.error(error);
          toast.error("Có lỗi khi lưu tiến độ");
        } else {
          toast.success(`Hoàn thành bài học!`, {
            description: `+${lesson.xp_reward} XP`,
          });
        }
      }
      navigate("/learn");
    }
  };

  const handleExit = () => {
    navigate("/learn");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 bg-background px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleExit}>
            <X className="size-6" />
          </Button>
          <Progress value={progress} className="h-3 flex-1" />
          <div className="flex items-center gap-1">
            <Heart className="size-5 text-destructive" fill="currentColor" />
            <span className="font-bold text-destructive">{hearts}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-lg px-4 pb-32 pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {/* Question */}
            <div className="mb-8">
              <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
                Câu {currentQuestionIndex + 1}/{questions.length}
              </h2>
              <p className="text-xl font-bold">{currentQuestion.question}</p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={isAnswered}
                  className={cn(
                    "w-full rounded-xl border-2 p-4 text-left font-semibold transition-all",
                    "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
                    selectedAnswer === index && !isAnswered && "border-primary bg-primary/10",
                    isAnswered && index === currentQuestion.correctIndex && "border-primary bg-primary/20",
                    isAnswered && selectedAnswer === index && !isCorrect && "border-destructive bg-destructive/20"
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {isAnswered && index === currentQuestion.correctIndex && (
                      <CheckCircle2 className="size-5 text-primary" />
                    )}
                    {isAnswered && selectedAnswer === index && !isCorrect && (
                      <XCircle className="size-5 text-destructive" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4">
        <div className="mx-auto max-w-lg">
          {!isAnswered ? (
            <Button
              onClick={handleCheckAnswer}
              disabled={selectedAnswer === null}
              className="w-full"
              size="lg"
            >
              Kiểm tra
            </Button>
          ) : (
            <div className="space-y-3">
              <Card
                className={cn(
                  "p-3",
                  isCorrect ? "border-primary bg-primary/10" : "border-destructive bg-destructive/10"
                )}
              >
                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="size-5 text-primary" />
                      <span className="font-bold text-primary">Chính xác!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-5 text-destructive" />
                      <span className="font-bold text-destructive">
                        Sai rồi! Đáp án đúng: {currentQuestion.options[currentQuestion.correctIndex]}
                      </span>
                    </>
                  )}
                </div>
              </Card>
              <Button
                onClick={handleContinue}
                className="w-full"
                size="lg"
                variant={isCorrect ? "default" : "destructive"}
              >
                Tiếp tục
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lesson;
