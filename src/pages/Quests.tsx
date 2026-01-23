import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Zap, BookOpen, Flame, Gift, Clock, Loader2, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useMemo, useState } from "react";

interface Quest {
  id: string;
  type: string;
  title: string;
  description: string | null;
  target_type: string;
  target_value: number;
  reward_gems: number;
  reward_streak: number;
  icon: string | null;
}

interface UserQuest {
  id: string;
  quest_id: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
  period_start: string;
}

const getIcon = (iconName: string | null) => {
  switch (iconName) {
    case "book": return BookOpen;
    case "zap": return Zap;
    case "flame": return Flame;
    case "target": return Target;
    default: return Target;
  }
};

const Quests = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Get current period starts
  const { dailyStart, weeklyStart } = useMemo(() => {
    const now = new Date();
    const daily = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = now.getDay();
    const weekStart = new Date(daily);
    weekStart.setDate(daily.getDate() - dayOfWeek);
    return {
      dailyStart: daily.toISOString().split("T")[0],
      weeklyStart: weekStart.toISOString().split("T")[0],
    };
  }, []);

  // Fetch quests
  const { data: quests, isLoading: questsLoading } = useQuery({
    queryKey: ["quests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data as Quest[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour (quests unlikely to change often)
  });

  // Fetch user profile for XP and streak
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("xp, streak_count, last_activity_date")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      
      // Check if streak should be reset
      if (data) {
        const today = new Date().toISOString().split("T")[0];
        const lastActivity = data.last_activity_date;
        const lastActivityDate = lastActivity ? new Date(lastActivity) : null;
        const todayDate = new Date(today);
        
        // If last activity was more than 1 day ago, reset streak
        if (lastActivityDate) {
          const timeDiff = todayDate.getTime() - lastActivityDate.getTime();
          const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
          
          if (daysDiff > 1) {
            // Reset streak if gap > 1 day
            const { error: resetError } = await supabase
              .from("profiles")
              .update({ streak_count: 0 })
              .eq("user_id", user.id);
            
            if (!resetError) {
              data.streak_count = 0;
            }
          }
        }
      }
      
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch completed lessons count for today/this week
  const { data: lessonCounts, isLoading: lessonCountsLoading } = useQuery({
    queryKey: ["lesson-counts", user?.id, dailyStart, weeklyStart],
    queryFn: async () => {
      if (!user?.id) return { daily: 0, weekly: 0 };

      const { count: dailyCount, error: dailyError } = await supabase
        .from("user_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("completed_at", `${dailyStart}T00:00:00.000Z`);

      if (dailyError) throw dailyError;

      const { count: weeklyCount, error: weeklyError } = await supabase
        .from("user_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("completed_at", `${weeklyStart}T00:00:00.000Z`);

      if (weeklyError) throw weeklyError;

      return {
        daily: dailyCount || 0,
        weekly: weeklyCount || 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch user quest progress
  const { data: userQuests, isLoading: userQuestsLoading } = useQuery({
    queryKey: ["user-quests", user?.id, dailyStart, weeklyStart],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_quests")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as UserQuest[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Calculate quest progress
  const getQuestProgress = (quest: Quest): { progress: number; completed: boolean; claimed: boolean } => {
    const periodStart = quest.type === "daily" ? dailyStart : weeklyStart;
    const userQuest = userQuests?.find(
      (uq) => uq.quest_id === quest.id && uq.period_start === periodStart
    );

    if (userQuest?.claimed) {
      return { progress: quest.target_value, completed: true, claimed: true };
    }

    let progress = 0;

    switch (quest.target_type) {
      case "lessons":
        progress = quest.type === "daily"
          ? lessonCounts?.daily || 0
          : lessonCounts?.weekly || 0;
        break;
      case "xp":
        // For simplicity, using profile XP (you could track period-specific XP)
        progress = profile?.xp || 0;
        break;
      case "streak":
        const today = new Date().toISOString().split("T")[0];
        const lastActivity = profile?.last_activity_date;
        progress = lastActivity === today ? 1 : 0;
        break;
    }

    const completed = progress >= quest.target_value;
    return {
      progress: Math.min(progress, quest.target_value),
      completed,
      claimed: userQuest?.claimed || false
    };
  };

  const handleClaimReward = async (quest: Quest) => {
    if (!user?.id) return;

    const periodStart = quest.type === "daily" ? dailyStart : weeklyStart;

    try {
      // Upsert user quest as claimed
      const { error: questError } = await supabase
        .from("user_quests")
        .upsert({
          user_id: user.id,
          quest_id: quest.id,
          progress: quest.target_value,
          completed: true,
          claimed: true,
          period_start: periodStart,
        }, {
          onConflict: "user_id,quest_id,period_start",
        });

      if (questError) throw questError;

      // Add gems to profile and update last_activity_date
      const today = new Date().toISOString().split("T")[0];
      const currentGems = profile?.xp ? 100 : 100; // Default gems
      const { data: profileData } = await supabase
        .from("profiles")
        .select("gems")
        .eq("user_id", user.id)
        .single();

      const { error: gemsError } = await supabase
        .from("profiles")
        .update({ 
          gems: (profileData?.gems || 0) + quest.reward_gems,
          last_activity_date: today
        })
        .eq("user_id", user.id);

      if (gemsError) throw gemsError;

      // Update streak if reward_streak > 0
      if (quest.reward_streak && quest.reward_streak > 0) {
        const currentStreak = profile?.streak_count || 0;
        const { error: streakError } = await supabase
          .from("profiles")
          .update({ streak_count: currentStreak + quest.reward_streak })
          .eq("user_id", user.id);

        if (streakError) throw streakError;
      }

      const rewards = [];
      if (quest.reward_gems && quest.reward_gems > 0) rewards.push(`+${quest.reward_gems} 💎`);
      if (quest.reward_streak && quest.reward_streak > 0) rewards.push(`+${quest.reward_streak} 🔥`);
      const rewardText = rewards.length > 0 ? rewards.join(" và ") : "";
      
      toast.success(rewardText + " đã được thêm vào tài khoản!");

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["user-quests"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("Có lỗi xảy ra khi nhận thưởng");
    }
  };

  const isLoading = authLoading || questsLoading || profileLoading || lessonCountsLoading || userQuestsLoading;

  const dailyQuests = quests?.filter((q) => q.type === "daily") || [];
  const weeklyQuests = quests?.filter((q) => q.type === "weekly") || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

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
          {dailyQuests.map((quest, index) => {
            const { progress, completed, claimed } = getQuestProgress(quest);
            return (
              <QuestCard
                key={quest.id}
                quest={quest}
                index={index}
                progress={progress}
                completed={completed}
                claimed={claimed}
                onClaim={() => handleClaimReward(quest)}
              />
            );
          })}
          {dailyQuests.length === 0 && (
            <Card className="p-4 text-center text-muted-foreground">
              Chưa có nhiệm vụ hàng ngày
            </Card>
          )}
        </div>
      </section>

      {/* Weekly Quests */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Gift className="size-5 text-accent" />
          <h2 className="text-lg font-bold">Nhiệm vụ hàng tuần</h2>
        </div>
        <div className="space-y-3">
          {weeklyQuests.map((quest, index) => {
            const { progress, completed, claimed } = getQuestProgress(quest);
            return (
              <QuestCard
                key={quest.id}
                quest={quest}
                index={index}
                progress={progress}
                completed={completed}
                claimed={claimed}
                onClaim={() => handleClaimReward(quest)}
              />
            );
          })}
          {weeklyQuests.length === 0 && (
            <Card className="p-4 text-center text-muted-foreground">
              Chưa có nhiệm vụ hàng tuần
            </Card>
          )}
        </div>
      </section>
    </div>
  );
};

const QuestCard = ({
  quest,
  index,
  progress,
  completed,
  claimed,
  onClaim
}: {
  quest: Quest;
  index: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  onClaim: () => void;
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const progressPercent = (progress / quest.target_value) * 100;
  const Icon = getIcon(quest.icon);

  const handleClaim = async () => {
    if (isClaiming || claimed) return; // Prevent double click
    setIsClaiming(true);
    try {
      await onClaim();
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        className={cn(
          "p-4",
          completed && !claimed && "bg-primary/5 border-primary",
          claimed && "bg-muted/50 opacity-75"
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl",
              completed ? "bg-primary" : "bg-muted"
            )}
          >
            <Icon
              className={cn(
                "size-6",
                completed ? "text-primary-foreground" : "text-foreground"
              )}
            />
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3
                  className={cn(
                    "font-bold",
                    completed && !claimed && "text-primary",
                    claimed && "line-through text-muted-foreground"
                  )}
                >
                  {quest.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {quest.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(quest.reward_gems ?? 0) > 0 && (
                  <div className="flex items-center gap-1 rounded-lg bg-secondary/20 px-2 py-1">
                    <Gem className="size-4 text-secondary" fill="currentColor" />
                    <span className="text-sm font-bold text-secondary">
                      +{quest.reward_gems}
                    </span>
                  </div>
                )}
                {(quest.reward_streak ?? 0) > 0 && (
                  <div className="flex items-center gap-1 rounded-lg bg-orange-500/20 px-2 py-1">
                    <Flame className="size-4 text-orange-500" fill="currentColor" />
                    <span className="text-sm font-bold text-orange-500">
                      +{quest.reward_streak}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {progress}/{quest.target_value}
                </span>
                <span className="font-semibold">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {completed && !claimed && (
              <Button size="sm" className="mt-3" onClick={handleClaim} disabled={isClaiming}>
                {isClaiming && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isClaiming ? "Đang xử lý..." : "Nhận thưởng"}
              </Button>
            )}
            {claimed && (
              <span className="mt-3 inline-block text-sm text-muted-foreground">
                ✓ Đã nhận
              </span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default Quests;
