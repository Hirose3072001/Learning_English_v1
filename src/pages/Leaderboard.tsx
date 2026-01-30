import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Trophy, Loader2, Users } from "lucide-react";
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

  // Fetch Study Leaderboard (XP only)
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["leaderboard-xp", user?.id],
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
    staleTime: 1000 * 60 * 2,
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

  const TopPodium = ({ data }: { data: LeaderboardUser[] }) => {
    const topThree = data.slice(0, 3);
    if (topThree.length === 0) return null;

    return (
      <div className="mb-10">
        <div className="flex items-end justify-center gap-4 sm:gap-8 px-4">
          {/* Second Place */}
          {topThree[1] && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <Avatar className={cn(
                "size-20 sm:size-24 border-[3px] border-slate-400 shadow-lg mb-3",
                topThree[1].isCurrentUser && "ring-2 ring-primary ring-offset-2"
              )}>
                <AvatarImage src={topThree[1].avatar_url || undefined} />
                <AvatarFallback className="bg-slate-200 text-slate-700 font-bold text-base">
                  {getInitials(topThree[1])}
                </AvatarFallback>
              </Avatar>

              <div className="flex items-center justify-center size-9 rounded-full bg-slate-400 mb-2 shadow">
                <span className="text-sm font-bold text-white">2</span>
              </div>

              <p className="text-sm sm:text-base font-bold max-w-[100px] truncate text-center mb-1">
                {topThree[1].isCurrentUser ? "Bạn" : getName(topThree[1])}
              </p>
              <p className="text-lg font-bold text-slate-600">
                {topThree[1].xp.toLocaleString()}
              </p>

              <div className="w-24 sm:w-28 h-16 sm:h-20 mt-3 rounded-t-xl bg-gradient-to-b from-slate-300 to-slate-400 flex items-center justify-center shadow-lg">
                <span className="text-xl sm:text-2xl font-bold text-white">2</span>
              </div>
            </motion.div>
          )}

          {/* First Place */}
          {topThree[0] && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center -mt-4 sm:-mt-6"
            >
              <Crown className="size-7 sm:size-9 text-gold mb-2" fill="currentColor" />

              <Avatar className={cn(
                "size-20 sm:size-28 border-4 border-gold shadow-2xl mb-3",
                topThree[0].isCurrentUser && "ring-2 ring-primary ring-offset-2"
              )}>
                <AvatarImage src={topThree[0].avatar_url || undefined} />
                <AvatarFallback className="bg-yellow-100 text-orange-900 font-bold text-lg sm:text-2xl">
                  {getInitials(topThree[0])}
                </AvatarFallback>
              </Avatar>

              <div className="flex items-center justify-center size-9 sm:size-11 rounded-full bg-gold mb-2 shadow-lg">
                <Trophy className="size-4 sm:size-6 text-orange-900" fill="currentColor" />
              </div>

              <p className="text-sm sm:text-base font-bold max-w-[100px] sm:max-w-[120px] truncate text-center mb-1">
                {topThree[0].isCurrentUser ? "Bạn" : getName(topThree[0])}
              </p>
              <p className="text-lg font-bold text-gold">
                {topThree[0].xp.toLocaleString()}
              </p>

              {/* Podium Base - Tallest */}
              <div className="w-28 sm:w-36 h-20 sm:h-28 mt-4 rounded-t-xl bg-gradient-to-b from-yellow-300 via-gold to-orange-400 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
                <div className="absolute bottom-3 left-0 right-0 text-center">
                  <span className="text-3xl font-bold text-orange-900">1</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Third Place */}
          {topThree[2] && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              {/* Podium Platform */}
              <div className="relative mb-4">
                <motion.div
                  animate={{
                    boxShadow: ["0 0 20px rgba(205,127,50,0.3)", "0 0 30px rgba(205,127,50,0.5)", "0 0 20px rgba(205,127,50,0.3)"]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full blur-xl bg-gradient-to-br from-orange-400 to-amber-600"
                />
                <Avatar className={cn(
                  "size-16 sm:size-20 border-4 relative z-10",
                  "border-transparent bg-gradient-to-br from-orange-400 via-amber-500 to-amber-600",
                  "shadow-xl",
                  topThree[2].isCurrentUser && "ring-4 ring-primary ring-offset-4"
                )}>
                  <AvatarImage src={topThree[2].avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-orange-300 to-amber-500 text-amber-900 font-bold text-sm">
                    {getInitials(topThree[2])}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Rank Badge */}
              <div className="flex items-center justify-center size-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 shadow-lg mb-2">
                <span className="text-xs font-bold text-amber-900">3</span>
              </div>

              <p className="text-xs sm:text-sm font-bold max-w-[80px] sm:max-w-[100px] truncate text-center mb-1">
                {topThree[2].isCurrentUser ? "Bạn" : getName(topThree[2])}
              </p>
              <p className="text-lg font-bold text-orange-600">
                {topThree[2].xp.toLocaleString()}
              </p>

              {/* Podium Base */}
              <div className="w-20 sm:w-24 h-10 sm:h-12 mt-4 rounded-t-xl bg-gradient-to-b from-orange-400 to-amber-600 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-lg font-bold text-amber-900">3</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  const RankingList = ({ data }: { data: LeaderboardUser[] }) => {
    const restOfList = data.slice(3);

    if (data.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden"
        >
          <Card className="p-12 text-center border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-background via-muted/5 to-background">
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Users className="mx-auto size-16 text-muted-foreground/40 mb-4" />
            </motion.div>
            <h2 className="text-xl font-bold mb-2 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Chưa có dữ liệu
            </h2>
            <p className="text-muted-foreground mb-6">
              Hãy là người đầu tiên ghi tên lên bảng vàng!
            </p>
          </Card>
        </motion.div>
      );
    }

    return (
      <div className="space-y-6">
        <TopPodium data={data} />

        {restOfList.length > 0 && (
          <div className="space-y-3 max-w-2xl mx-auto">
            {restOfList.map((userItem, index) => (
              <motion.div
                key={`${userItem.id}-${index}`}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.05, type: "spring", stiffness: 100 }}
                whileHover={{ scale: 1.02, x: 4 }}
                className="group"
              >
                <Card
                  className={cn(
                    "relative overflow-hidden transition-all duration-300",
                    "hover:shadow-xl hover:shadow-primary/10",
                    userItem.isCurrentUser && "ring-2 ring-primary shadow-lg shadow-primary/20"
                  )}
                >
                  {/* Gradient accent bar */}
                  <div
                    className={cn(
                      "absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2",
                      userItem.isCurrentUser
                        ? "bg-gradient-to-b from-primary via-primary/80 to-primary/60"
                        : "bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10"
                    )}
                  />

                  {/* Background gradient on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-primary/5 to-transparent" />

                  <div className="relative flex items-center gap-4 p-4">
                    {/* Rank Badge */}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={cn(
                        "flex items-center justify-center size-12 rounded-xl font-bold text-lg shrink-0 transition-all",
                        userItem.isCurrentUser
                          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg"
                          : "bg-gradient-to-br from-muted to-muted/50 text-muted-foreground"
                      )}
                    >
                      {userItem.rank}
                    </motion.div>

                    {/* Avatar */}
                    <motion.div whileHover={{ scale: 1.1 }}>
                      <Avatar className="size-12 border-2 border-border shadow-md">
                        <AvatarImage src={userItem.avatar_url || undefined} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-muted to-muted/50 font-semibold">
                          {getInitials(userItem)}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-bold text-base truncate transition-colors",
                        userItem.isCurrentUser && "text-primary"
                      )}
                      >
                        {userItem.isCurrentUser ? "Bạn" : getName(userItem)}
                      </p>
                    </div>

                    {/* XP Score */}
                    <div className="text-right">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="font-bold text-xl text-primary"
                      >
                        {userItem.xp.toLocaleString()}
                      </motion.div>
                      <span className="text-xs text-muted-foreground font-semibold">XP</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading && !leaderboardData.length) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="size-12 text-primary" />
        </motion.div>
        <p className="mt-4 text-muted-foreground font-medium">Đang tải bảng xếp hạng...</p>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6 max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center mb-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-orange-400 text-white">
            <Trophy className="size-8" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Bảng xếp hạng</h1>
        <p className="text-muted-foreground">
          Xem thứ hạng của bạn và cạnh tranh với người học khác
        </p>
      </div>

      {/* Leaderboard Content */}
      <RankingList data={leaderboardData} />
    </div>
  );
};

export default Leaderboard;
