import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, Star, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface LessonNode {
  id: number;
  title: string;
  status: "completed" | "current" | "locked";
  xp?: number;
}

const lessons: LessonNode[] = [
  { id: 1, title: "Xin chào", status: "completed", xp: 10 },
  { id: 2, title: "Gia đình", status: "completed", xp: 15 },
  { id: 3, title: "Thức ăn", status: "current" },
  { id: 4, title: "Động vật", status: "locked" },
  { id: 5, title: "Màu sắc", status: "locked" },
  { id: 6, title: "Số đếm", status: "locked" },
  { id: 7, title: "Thời gian", status: "locked" },
];

const Learn = () => {
  return (
    <div className="py-6">
      {/* Unit Header */}
      <Card className="mb-6 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Đơn vị 1</h2>
            <p className="text-sm text-muted-foreground">Cơ bản</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Tiến độ</p>
            <p className="font-bold text-primary">2/7</p>
          </div>
        </div>
        <Progress value={(2 / 7) * 100} className="mt-3 h-3" />
      </Card>

      {/* Lesson Path */}
      <div className="relative flex flex-col items-center gap-4">
        {lessons.map((lesson, index) => (
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
            {index < lessons.length - 1 && (
              <div
                className={cn(
                  "absolute top-full h-8 w-0.5 bg-border",
                  index % 2 === 0 ? "left-1/2 rotate-[30deg]" : "right-1/2 -rotate-[30deg]"
                )}
              />
            )}

            <LessonButton lesson={lesson} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const LessonButton = ({ lesson }: { lesson: LessonNode }) => {
  const navigate = useNavigate();
  const isCompleted = lesson.status === "completed";
  const isCurrent = lesson.status === "current";
  const isLocked = lesson.status === "locked";

  const handleClick = () => {
    if (isLocked) return;
    
    if (isCurrent) {
      toast.info(`Bắt đầu bài học: ${lesson.title}`, {
        description: "Tính năng bài học đang được phát triển!",
      });
      // TODO: Navigate to lesson page when implemented
      // navigate(`/lesson/${lesson.id}`);
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
      {isCompleted && lesson.xp && (
        <span className="text-xs font-bold text-gold">+{lesson.xp} XP</span>
      )}
    </div>
  );
};

export default Learn;
