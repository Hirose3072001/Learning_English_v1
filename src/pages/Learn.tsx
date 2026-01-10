import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, Star, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LessonWithProgress {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  order_index: number;
  status: "completed" | "current" | "locked";
}

const Learn = () => {
  const { user } = useAuth();

  // Fetch units
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
  });

  // Fetch lessons for first unit
  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ["lessons", units?.[0]?.id],
    queryFn: async () => {
      if (!units?.[0]?.id) return [];
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("unit_id", units[0].id)
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!units?.[0]?.id,
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

  // Compute lesson statuses
  const lessonsWithStatus: LessonWithProgress[] = (lessons || []).map((lesson, index) => {
    const completedLessonIds = new Set((progress || []).map((p) => p.lesson_id));
    const isCompleted = completedLessonIds.has(lesson.id);

    // Find the first incomplete lesson
    let firstIncompleteLessonIndex = (lessons || []).findIndex(
      (l) => !completedLessonIds.has(l.id)
    );
    if (firstIncompleteLessonIndex === -1) {
      firstIncompleteLessonIndex = (lessons || []).length;
    }

    let status: "completed" | "current" | "locked" = "locked";
    if (isCompleted) {
      status = "completed";
    } else if (index === firstIncompleteLessonIndex) {
      status = "current";
    }

    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      xp_reward: lesson.xp_reward,
      order_index: lesson.order_index,
      status,
    };
  });

  const completedCount = lessonsWithStatus.filter((l) => l.status === "completed").length;
  const totalCount = lessonsWithStatus.length;

  if (unitsLoading || lessonsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentUnit = units?.[0];

  return (
    <div className="py-6">
      {/* Unit Header */}
      <Card className="mb-6 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{currentUnit?.title || "Đơn vị 1"}</h2>
            <p className="text-sm text-muted-foreground">{currentUnit?.description || "Cơ bản"}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Tiến độ</p>
            <p className="font-bold text-primary">
              {completedCount}/{totalCount}
            </p>
          </div>
        </div>
        <Progress value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0} className="mt-3 h-3" />
      </Card>

      {/* Lesson Path */}
      <div className="relative flex flex-col items-center gap-4">
        {lessonsWithStatus.map((lesson, index) => (
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "relative",
              index % 2 === 0 ? "self-start ml-8" : "self-end mr-8"
            )}
          >
            {/* Connecting line */}
            {index < lessonsWithStatus.length - 1 && (
              <div
                className={cn(
                  "absolute top-full h-8 w-0.5 bg-border",
                  index % 2 === 0 ? "left-1/2 rotate-[30deg]" : "right-1/2 -rotate-[30deg]"
                )}
              />
            )}

            <LessonButton lesson={lesson} userId={user?.id} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const LessonButton = ({ lesson, userId }: { lesson: LessonWithProgress; userId?: string }) => {
  const navigate = useNavigate();
  const isCompleted = lesson.status === "completed";
  const isCurrent = lesson.status === "current";
  const isLocked = lesson.status === "locked";

  const handleClick = async () => {
    if (isLocked) return;

    if (isCurrent) {
      // Mark lesson as completed (demo behavior)
      if (userId) {
        const { error } = await supabase.from("user_progress").insert({
          user_id: userId,
          lesson_id: lesson.id,
          completed: true,
          completed_at: new Date().toISOString(),
          score: 100,
        });

        if (error) {
          toast.error("Có lỗi xảy ra khi lưu tiến độ");
          console.error(error);
          return;
        }

        toast.success(`Hoàn thành bài: ${lesson.title}`, {
          description: `+${lesson.xp_reward} XP!`,
        });

        // Reload the page to refresh progress
        window.location.reload();
      } else {
        toast.info(`Bắt đầu bài học: ${lesson.title}`, {
          description: "Đang phát triển tính năng...",
        });
      }
    } else if (isCompleted) {
      toast.success(`Ôn tập bài: ${lesson.title}`, {
        description: "Bạn đã hoàn thành bài này!",
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        size="icon"
        onClick={handleClick}
        className={cn(
          "size-20 rounded-full transition-all",
          isCompleted && "bg-gold shadow-[0_4px_0_0_hsl(35_93%_40%)] hover:brightness-110",
          isCurrent && "animate-pulse-glow bg-primary shadow-duo-button hover:brightness-110",
          isLocked && "bg-muted text-muted-foreground shadow-duo cursor-not-allowed"
        )}
        disabled={isLocked}
      >
        {isCompleted && <CheckCircle2 className="size-10" />}
        {isCurrent && <Star className="size-10" fill="currentColor" />}
        {isLocked && <Lock className="size-8" />}
      </Button>
      <span
        className={cn(
          "text-sm font-semibold",
          isLocked ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {lesson.title}
      </span>
      {isCompleted && lesson.xp_reward && (
        <span className="text-xs font-bold text-gold">+{lesson.xp_reward} XP</span>
      )}
    </div>
  );
};

export default Learn;
