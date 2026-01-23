import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Medal, Trophy, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardUser {
  rank: number;
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  isCurrentUser: boolean;
}

const Leaderboard = () => {
  const { user, loading: authLoading } = useAuth();

  // Fetch profiles from leaderboard view ordered by XP
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["leaderboard", user?.id],
    enabled: !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_leaderboard")
        .select("id, user_id, username, display_name, avatar_url, xp")
        .order("xp", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const leaderboardData: LeaderboardUser[] = (profiles || []).map((profile, index) => ({
    rank: index + 1,
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    xp: profile.xp,
    isCurrentUser: profile.user_id === user?.id,
  }));

  const getInitials = (user: LeaderboardUser) => {
    const name = user.display_name || user.username;
    return name.slice(0, 2).toUpperCase();
  };

  const getName = (user: LeaderboardUser) => {
    return user.display_name || user.username;
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (leaderboardData.length === 0) {
    return (
      <div className="py-6">
        <div className="mb-6 text-center">
          <Trophy className="mx-auto size-12 text-gold" fill="currentColor" />
          <h1 className="mt-2 text-2xl font-bold">Bảng xếp hạng</h1>
          <p className="text-muted-foreground">Tuần này</p>
        </div>
        <Card className="p-8 text-center">
          <Users className="mx-auto size-16 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Chưa có ai trên bảng xếp hạng</h2>
          <p className="text-muted-foreground">
            Hãy hoàn thành các bài học để xuất hiện trên bảng xếp hạng!
          </p>
        </Card>
      </div>
    );
  }

  const topThree = leaderboardData.slice(0, 3);
  const restOfList = leaderboardData.slice(3);

  return (
    <div className="py-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <Trophy className="mx-auto size-12 text-gold" fill="currentColor" />
        <h1 className="mt-2 text-2xl font-bold">Bảng xếp hạng</h1>
        <p className="text-muted-foreground">Tuần này</p>
      </div>

      {/* Top 3 Podium */}
      {topThree.length >= 1 && (
        <div className="mb-6 flex items-end justify-center gap-2">
          {/* Second Place */}
          {topThree[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <Avatar className={cn(
                "size-16 border-4 border-secondary",
                topThree[1].isCurrentUser && "ring-2 ring-primary ring-offset-2"
              )}>
                <AvatarImage src={topThree[1].avatar_url || undefined} />
                <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">
                  {getInitials(topThree[1])}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 flex size-8 items-center justify-center rounded-full bg-secondary">
                <span className="text-sm font-bold text-secondary-foreground">2</span>
              </div>
              <p className={cn(
                "mt-1 text-sm font-semibold",
                topThree[1].isCurrentUser && "text-primary"
              )}>
                {topThree[1].isCurrentUser ? "Bạn" : getName(topThree[1])}
              </p>
              <p className="text-xs text-muted-foreground">{topThree[1].xp.toLocaleString()} XP</p>
            </motion.div>
          )}

          {/* First Place */}
          {topThree[0] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <Crown className="mb-1 size-8 text-gold" fill="currentColor" />
              <Avatar className={cn(
                "size-20 border-4 border-gold",
                topThree[0].isCurrentUser && "ring-2 ring-primary ring-offset-2"
              )}>
                <AvatarImage src={topThree[0].avatar_url || undefined} />
                <AvatarFallback className="bg-gold text-gold-foreground font-bold text-lg">
                  {getInitials(topThree[0])}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 flex size-8 items-center justify-center rounded-full bg-gold">
                <span className="text-sm font-bold text-gold-foreground">1</span>
              </div>
              <p className={cn(
                "mt-1 font-bold",
                topThree[0].isCurrentUser && "text-primary"
              )}>
                {topThree[0].isCurrentUser ? "Bạn" : getName(topThree[0])}
              </p>
              <p className="text-sm font-semibold text-gold">{topThree[0].xp.toLocaleString()} XP</p>
            </motion.div>
          )}

          {/* Third Place */}
          {topThree[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <Avatar className={cn(
                "size-16 border-4 border-warning",
                topThree[2].isCurrentUser && "ring-2 ring-primary ring-offset-2"
              )}>
                <AvatarImage src={topThree[2].avatar_url || undefined} />
                <AvatarFallback className="bg-warning text-warning-foreground font-bold">
                  {getInitials(topThree[2])}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 flex size-8 items-center justify-center rounded-full bg-warning">
                <span className="text-sm font-bold text-warning-foreground">3</span>
              </div>
              <p className={cn(
                "mt-1 text-sm font-semibold",
                topThree[2].isCurrentUser && "text-primary"
              )}>
                {topThree[2].isCurrentUser ? "Bạn" : getName(topThree[2])}
              </p>
              <p className="text-xs text-muted-foreground">{topThree[2].xp.toLocaleString()} XP</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Rest of the list */}
      {restOfList.length > 0 && (
        <Card className="overflow-hidden">
          {restOfList.map((userItem, index) => (
            <motion.div
              key={userItem.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className={cn(
                "flex items-center gap-4 border-b border-border p-4 last:border-b-0",
                userItem.isCurrentUser && "bg-primary/10"
              )}
            >
              <span className="w-8 text-center font-bold text-muted-foreground">
                {userItem.rank}
              </span>
              <Avatar>
                <AvatarImage src={userItem.avatar_url || undefined} />
                <AvatarFallback className="bg-muted font-semibold">
                  {getInitials(userItem)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className={cn("font-semibold", userItem.isCurrentUser && "text-primary")}>
                  {userItem.isCurrentUser ? "Bạn" : getName(userItem)}
                </p>
              </div>
              <span className="font-bold text-primary">{userItem.xp.toLocaleString()} XP</span>
            </motion.div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default Leaderboard;
