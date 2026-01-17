import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, Star, CheckCircle2, Loader2, BookOpen, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import UnitGuide from "@/components/learn/UnitGuide";

interface LessonWithProgress {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  order_index: number;
  status: "completed" | "current" | "locked";
  icon: string | null;
}

interface UnitWithLessons {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: LessonWithProgress[];
  completedCount: number;
  totalCount: number;
}

const Learn = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch units with caching
  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Fetch all lessons with caching
  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ["all-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Fetch user progress
  const { data: progress } = useQuery({
    queryKey: ["user_progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isLoading = unitsLoading || lessonsLoading;

  // Process units with lessons and progress
  const unitsWithLessons: UnitWithLessons[] = (units || []).map((unit) => {
    const unitLessons = (lessons || []).filter((l) => l.unit_id === unit.id);
    const completedLessonIds = new Set((progress || []).map((p) => p.lesson_id));
    
    // Find the first incomplete lesson globally for determining unlock status
    const allLessonsOrdered = (lessons || []).sort((a, b) => a.order_index - b.order_index);
    const firstIncompleteLessonId = allLessonsOrdered.find(
      (l) => !completedLessonIds.has(l.id)
    )?.id;

    const lessonsWithStatus: LessonWithProgress[] = unitLessons.map((lesson) => {
      const isCompleted = completedLessonIds.has(lesson.id);
      let status: "completed" | "current" | "locked" = "locked";
      
      if (isCompleted) {
        status = "completed";
      } else if (lesson.id === firstIncompleteLessonId) {
        status = "current";
      }

      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        xp_reward: lesson.xp_reward,
        order_index: lesson.order_index,
        status,
        icon: lesson.icon,
      };
    });

    const completedCount = lessonsWithStatus.filter((l) => l.status === "completed").length;

    return {
      id: unit.id,
      title: unit.title,
      description: unit.description,
      order_index: unit.order_index,
      lessons: lessonsWithStatus,
      completedCount,
      totalCount: lessonsWithStatus.length,
    };
  });

  const totalCompleted = unitsWithLessons.reduce((acc, u) => acc + u.completedCount, 0);
  const totalLessons = unitsWithLessons.reduce((acc, u) => acc + u.totalCount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Overall Progress Header */}
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <BookOpen className="size-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Hành trình học tập</h1>
                <p className="text-sm text-muted-foreground">Tiếng Anh cơ bản</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-primary">
                <Zap className="size-5" fill="currentColor" />
                <span className="text-2xl font-bold">{totalCompleted}</span>
              </div>
              <p className="text-xs text-muted-foreground">/{totalLessons} bài học</p>
            </div>
          </div>
          <Progress 
            value={totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0} 
            className="h-3" 
          />
        </div>
      </Card>

      {/* Units */}
      {unitsWithLessons.map((unit, unitIndex) => (
        <motion.div
          key={unit.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: unitIndex * 0.1 }}
        >
          <Card className="overflow-hidden">
            {/* Unit Header */}
            <div className="border-b border-border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg">{unit.title}</h2>
                  {unit.description && (
                    <p className="text-sm text-muted-foreground">{unit.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {unit.completedCount}/{unit.totalCount}
                  </span>
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {unit.totalCount > 0 ? Math.round((unit.completedCount / unit.totalCount) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lessons Grid */}
            <div className="p-4 grid gap-3">
              {/* Unit Guide */}
              <UnitGuide
                unitTitle={unit.title}
                unitDescription={unit.description}
                lessons={unit.lessons.map((l) => ({
                  id: l.id,
                  title: l.title,
                  description: l.description,
                  xp_reward: l.xp_reward,
                }))}
              />

              {unit.lessons.map((lesson, lessonIndex) => (
                <LessonCard 
                  key={lesson.id} 
                  lesson={lesson} 
                  index={lessonIndex}
                />
              ))}
            </div>
          </Card>
        </motion.div>
      ))}

      {unitsWithLessons.length === 0 && (
        <Card className="p-8 text-center">
          <BookOpen className="mx-auto size-16 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Chưa có bài học nào</h2>
          <p className="text-muted-foreground">
            Các bài học sẽ sớm được cập nhật!
          </p>
        </Card>
      )}
    </div>
  );
};

const LessonCard = ({ 
  lesson, 
  index 
}: { 
  lesson: LessonWithProgress; 
  index: number;
}) => {
  const navigate = useNavigate();
  const isCompleted = lesson.status === "completed";
  const isCurrent = lesson.status === "current";
  const isLocked = lesson.status === "locked";

  const handleClick = () => {
    if (isLocked) {
      toast.error("Hoàn thành bài trước để mở khóa!");
      return;
    }
    // Navigate to flashcards first to learn vocabulary before quiz
    navigate(`/lesson/${lesson.id}/flashcards`);
  };

  const getIcon = () => {
    switch (lesson.icon) {
      case "star": return <Star className="size-5" />;
      case "book": return <BookOpen className="size-5" />;
      default: return <Star className="size-5" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Button
        variant="ghost"
        onClick={handleClick}
        disabled={isLocked}
        className={cn(
          "w-full h-auto p-4 justify-start gap-4 transition-all",
          "hover:bg-muted/80",
          isCompleted && "bg-green-500/10 hover:bg-green-500/20 border border-green-500/30",
          isCurrent && "bg-primary/10 hover:bg-primary/20 border-2 border-primary shadow-sm",
          isLocked && "opacity-60 cursor-not-allowed"
        )}
      >
        {/* Status Icon */}
        <div className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl transition-all",
          isCompleted && "bg-green-500 text-white",
          isCurrent && "bg-primary text-primary-foreground animate-pulse",
          isLocked && "bg-muted text-muted-foreground"
        )}>
          {isCompleted ? (
            <CheckCircle2 className="size-6" />
          ) : isLocked ? (
            <Lock className="size-5" />
          ) : (
            getIcon()
          )}
        </div>

        {/* Content */}
        <div className="flex-1 text-left">
          <p className={cn(
            "font-semibold",
            isCompleted && "text-green-700 dark:text-green-400",
            isCurrent && "text-primary",
            isLocked && "text-muted-foreground"
          )}>
            {lesson.title}
          </p>
          {lesson.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {lesson.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              "text-xs font-medium",
              isCompleted ? "text-green-600" : "text-muted-foreground"
            )}>
              +{lesson.xp_reward} XP
            </span>
            {isCurrent && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                Tiếp theo
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        {!isLocked && (
          <ChevronRight className={cn(
            "size-5 shrink-0",
            isCompleted ? "text-green-500" : "text-primary"
          )} />
        )}
      </Button>
    </motion.div>
  );
};

export default Learn;
