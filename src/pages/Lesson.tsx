import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { X, Heart, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Question {
  id: string;
  question: string;
  options: string[];
  explanation: string | null;
  order_index: number;
}

interface AnswerResult {
  isCorrect: boolean;
  correctIndex: number;
  correctAnswer: string;
  explanation: string | null;
}

const Lesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [hearts, setHearts] = useState(5);
  const [correctCount, setCorrectCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // Fetch lesson details
  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  // Fetch questions from database using the public view (no correct_index)
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ["questions", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions_public")
        .select("*")
        .eq("lesson_id", lessonId)
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      
      // Parse options from JSONB to string array
      return (data || []).map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string)
      })) as Question[];
    },
    enabled: !!lessonId,
  });

  const isLoading = lessonLoading || questionsLoading;
  const currentQuestion = questions?.[currentQuestionIndex];
  const totalQuestions = questions?.length || 0;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex) / totalQuestions) * 100 : 0;

  const handleSelectAnswer = (index: number) => {
    if (isAnswered || isChecking) return;
    setSelectedAnswer(index);
  };

  const handleCheckAnswer = async () => {
    if (selectedAnswer === null || !currentQuestion || isChecking) return;

    setIsChecking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        toast.error("Vui lòng đăng nhập để tiếp tục");
        navigate("/login");
        return;
      }

      const response = await supabase.functions.invoke("verify-answer", {
        body: { questionId: currentQuestion.id, selectedIndex: selectedAnswer },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data as AnswerResult;
      setAnswerResult(result);
      setIsCorrect(result.isCorrect);
      setIsAnswered(true);

      if (result.isCorrect) {
        setCorrectCount((prev) => prev + 1);
      } else {
        setHearts((prev) => prev - 1);
      }
    } catch (error) {
      console.error("Error verifying answer:", error);
      toast.error("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setIsChecking(false);
    }
  };

  const handleContinue = async () => {
    if (hearts <= 0) {
      toast.error("Hết tim! Thử lại sau nhé.");
      navigate("/learn");
      return;
    }

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(false);
      setAnswerResult(null);
    } else {
      // Lesson completed!
      if (user && lesson) {
        // Check if already completed
        const { data: existingProgress } = await supabase
          .from("user_progress")
          .select("id")
          .eq("user_id", user.id)
          .eq("lesson_id", lesson.id)
          .maybeSingle();

        if (!existingProgress) {
          // Insert progress
          const { error: progressError } = await supabase.from("user_progress").insert({
            user_id: user.id,
            lesson_id: lesson.id,
            completed: true,
            completed_at: new Date().toISOString(),
            score: Math.round((correctCount / totalQuestions) * 100),
          });

          if (progressError) {
            console.error(progressError);
            toast.error("Có lỗi khi lưu tiến độ");
          } else {
            // Get current profile XP and update
            const { data: profile } = await supabase
              .from("profiles")
              .select("xp")
              .eq("user_id", user.id)
              .single();

            if (profile) {
              const newXp = (profile.xp || 0) + lesson.xp_reward;
              const { error: xpError } = await supabase
                .from("profiles")
                .update({ xp: newXp })
                .eq("user_id", user.id);

              if (xpError) {
                console.error("Error updating XP:", xpError);
              }
            }

            toast.success(`🎉 Hoàn thành bài học!`, {
              description: `Điểm: ${Math.round((correctCount / totalQuestions) * 100)}% | +${lesson.xp_reward} XP`,
            });
          }
        } else {
          toast.success("Bạn đã hoàn thành bài này trước đó!");
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

  if (!questions || questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="max-w-md p-6 text-center">
          <XCircle className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-bold">Chưa có câu hỏi</h2>
          <p className="mb-4 text-muted-foreground">
            Bài học này chưa có câu hỏi nào. Vui lòng thử lại sau!
          </p>
          <Button onClick={handleExit}>Quay lại</Button>
        </Card>
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
                Câu {currentQuestionIndex + 1}/{totalQuestions}
              </h2>
              <p className="text-xl font-bold">{currentQuestion?.question}</p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion?.options.map((option, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={isAnswered}
                  className={cn(
                    "w-full rounded-xl border-2 p-4 text-left font-semibold transition-all",
                    "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary",
                    selectedAnswer === index && !isAnswered && "border-primary bg-primary/10",
                    isAnswered && answerResult && index === answerResult.correctIndex && "border-green-500 bg-green-500/20",
                    isAnswered && selectedAnswer === index && !isCorrect && "border-destructive bg-destructive/20"
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {isAnswered && answerResult && index === answerResult.correctIndex && (
                      <CheckCircle2 className="size-5 text-green-500" />
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
              disabled={selectedAnswer === null || isChecking}
              className="w-full"
              size="lg"
            >
              {isChecking ? "Đang kiểm tra..." : "Kiểm tra"}
            </Button>
          ) : (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card
                className={cn(
                  "p-4",
                  isCorrect ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10"
                )}
              >
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <Sparkles className="size-6 shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="size-6 shrink-0 text-destructive" />
                  )}
                  <div className="flex-1">
                    <p className={cn(
                      "font-bold",
                      isCorrect ? "text-green-600" : "text-destructive"
                    )}>
                      {isCorrect ? "🎉 Chính xác!" : "Sai rồi!"}
                    </p>
                    {!isCorrect && answerResult && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Đáp án đúng: <span className="font-semibold">{answerResult.correctAnswer}</span>
                      </p>
                    )}
                    {answerResult?.explanation && (
                      <p className="mt-2 text-sm text-foreground/80">
                        💡 {answerResult.explanation}
                      </p>
                    )}
                  </div>
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
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lesson;
