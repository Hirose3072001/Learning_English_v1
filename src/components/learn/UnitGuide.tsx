import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronDown, Lightbulb, Target, List } from "lucide-react";
import { useState } from "react";

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

const UnitGuide = ({ unitTitle, unitDescription, lessons }: UnitGuideProps) => {
  const [isOpen, setIsOpen] = useState(false);

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
            <Lightbulb className="size-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-primary">Hướng dẫn</p>
            <p className="text-xs text-muted-foreground">
              {lessons.length} bài học • {totalXP} XP
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
              <div className="p-4 space-y-4">
                {/* Unit Overview */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="size-4 text-primary" />
                    <h3 className="font-semibold">Mục tiêu</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {unitDescription || `Hoàn thành ${lessons.length} bài học trong đơn vị "${unitTitle}" để nắm vững kiến thức cơ bản.`}
                  </p>
                </div>

                {/* Lessons List */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <List className="size-4 text-primary" />
                    <h3 className="font-semibold">Nội dung bài học</h3>
                  </div>
                  <div className="space-y-2">
                    {lessons.map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className="flex items-start gap-3 rounded-lg bg-background/50 p-3 border"
                      >
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{lesson.title}</p>
                          {lesson.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {lesson.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-medium text-primary shrink-0">
                          +{lesson.xp_reward} XP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="size-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="font-medium text-amber-700 dark:text-amber-300 text-sm">
                      Mẹo học tập
                    </h4>
                  </div>
                  <ul className="text-xs text-amber-700/80 dark:text-amber-300/80 space-y-1 ml-6 list-disc">
                    <li>Hoàn thành các bài học theo thứ tự để hiểu bài tốt hơn</li>
                    <li>Nghe phát âm và lặp lại nhiều lần</li>
                    <li>Ôn tập bài cũ trước khi học bài mới</li>
                  </ul>
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
