import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Zap, BookOpen, Flame, Gift, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Quest {
  id: number;
  title: string;
  description: string;
  progress: number;
  total: number;
  reward: number;
  icon: React.ElementType;
  completed: boolean;
}

const dailyQuests: Quest[] = [
  {
    id: 1,
    title: "Hoàn thành 1 bài học",
    description: "Học một bài học mới hôm nay",
    progress: 0,
    total: 1,
    reward: 10,
    icon: BookOpen,
    completed: false,
  },
  {
    id: 2,
    title: "Kiếm 50 XP",
    description: "Tích lũy 50 điểm kinh nghiệm",
    progress: 25,
    total: 50,
    reward: 15,
    icon: Zap,
    completed: false,
  },
  {
    id: 3,
    title: "Duy trì streak",
    description: "Học mỗi ngày để duy trì streak",
    progress: 1,
    total: 1,
    reward: 5,
    icon: Flame,
    completed: true,
  },
];

const weeklyQuests: Quest[] = [
  {
    id: 4,
    title: "Hoàn thành 10 bài học",
    description: "Học 10 bài trong tuần",
    progress: 3,
    total: 10,
    reward: 100,
    icon: Target,
    completed: false,
  },
  {
    id: 5,
    title: "Kiếm 500 XP",
    description: "Tích lũy 500 XP trong tuần",
    progress: 150,
    total: 500,
    reward: 150,
    icon: Zap,
    completed: false,
  },
];

const Quests = () => {
  return (
    <div className="py-6">
      <div className="mb-6 text-center">
        <Target className="mx-auto size-12 text-primary" />
        <h1 className="mt-2 text-2xl font-bold">Nhiệm vụ</h1>
        <p className="text-muted-foreground">Hoàn thành nhiệm vụ để nhận thưởng</p>
      </div>

      {/* Daily Quests */}
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Nhiệm vụ hàng ngày</h2>
        </div>
        <div className="space-y-3">
          {dailyQuests.map((quest, index) => (
            <QuestCard key={quest.id} quest={quest} index={index} />
          ))}
        </div>
      </section>

      {/* Weekly Quests */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Gift className="size-5 text-accent" />
          <h2 className="text-lg font-bold">Nhiệm vụ hàng tuần</h2>
        </div>
        <div className="space-y-3">
          {weeklyQuests.map((quest, index) => (
            <QuestCard key={quest.id} quest={quest} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
};

const QuestCard = ({ quest, index }: { quest: Quest; index: number }) => {
  const progressPercent = (quest.progress / quest.total) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        className={cn(
          "p-4",
          quest.completed && "bg-primary/5 border-primary"
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl",
              quest.completed ? "bg-primary" : "bg-muted"
            )}
          >
            <quest.icon
              className={cn(
                "size-6",
                quest.completed ? "text-primary-foreground" : "text-foreground"
              )}
            />
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3
                  className={cn(
                    "font-bold",
                    quest.completed && "text-primary"
                  )}
                >
                  {quest.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {quest.description}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-gold/20 px-2 py-1">
                <Zap className="size-4 text-gold" fill="currentColor" />
                <span className="text-sm font-bold text-gold">
                  +{quest.reward}
                </span>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {quest.progress}/{quest.total}
                </span>
                <span className="font-semibold">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {quest.completed && (
              <Button size="sm" variant="gold" className="mt-3">
                Nhận thưởng
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default Quests;
