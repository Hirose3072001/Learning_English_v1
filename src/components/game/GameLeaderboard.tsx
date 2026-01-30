import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface GameLeaderboardProps {
    gameId: string;
    gameName: string;
    currentUserScore?: number;
}

interface LeaderboardEntry {
    user_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    high_score: number;
    rank: number;
    isCurrentUser: boolean;
}

const GameLeaderboard = ({ gameId, gameName, currentUserScore }: GameLeaderboardProps) => {
    const { user } = useAuth();

    // Fetch top 10 players
    const { data: topPlayers, isLoading } = useQuery({
        queryKey: ["game-leaderboard", gameId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("user_id, username, display_name, avatar_url, high_score")
                .gt("high_score", 0)
                .order("high_score", { ascending: false })
                .limit(10);

            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 30, // 30 seconds
    });

    // Fetch current user's rank if not in top 10
    const { data: userRank } = useQuery({
        queryKey: ["user-game-rank", gameId, user?.id, currentUserScore],
        enabled: !!user && !!currentUserScore,
        queryFn: async () => {
            if (!user) return null;

            // Get user's current high score
            const { data: userProfile } = await supabase
                .from("profiles")
                .select("high_score")
                .eq("user_id", user.id)
                .single();

            const userScore = userProfile?.high_score || 0;

            // Count how many users have higher scores
            const { count } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .gt("high_score", userScore);

            return {
                rank: (count || 0) + 1,
                score: userScore,
            };
        },
        staleTime: 1000 * 30,
    });

    const getInitials = (username: string, displayName: string | null) => {
        const name = displayName || username;
        return name.slice(0, 2).toUpperCase();
    };

    const getName = (username: string, displayName: string | null) => {
        return displayName || username;
    };

    const getMedalColor = (rank: number) => {
        switch (rank) {
            case 1:
                return "from-yellow-300 via-gold to-orange-400";
            case 2:
                return "from-slate-300 to-slate-400";
            case 3:
                return "from-orange-400 to-amber-600";
            default:
                return "from-muted to-muted/50";
        }
    };

    const getMedalIcon = (rank: number) => {
        if (rank === 1) return <Trophy className="size-5 text-orange-900" fill="currentColor" />;
        return <Medal className="size-4 text-foreground/70" />;
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <Loader2 className="size-10 text-primary" />
                </motion.div>
                <p className="mt-4 text-muted-foreground">Đang tải bảng xếp hạng...</p>
            </div>
        );
    }

    // Use real data from database
    const top10Data: LeaderboardEntry[] = (topPlayers || [])
        .slice(0, 10)
        .map((player, index) => ({
            ...player,
            rank: index + 1,
            isCurrentUser: player.user_id === user?.id,
        }));

    // Check if current user is in top 10
    const currentUserInTop10 = top10Data.find((entry) => entry.isCurrentUser);

    // Show user rank separately if they're outside top 10 and have a score
    const showUserRankSeparately = !currentUserInTop10 && userRank && userRank.score > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="inline-flex p-3 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20"
                >
                    <Trophy className="size-8 text-orange-500" fill="currentColor" />
                </motion.div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                    {gameName}
                </h2>
                <p className="text-muted-foreground text-sm">Top 10 người chơi xuất sắc nhất</p>
            </div>

            {/* Leaderboard List */}
            {top10Data.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                    <Trophy className="mx-auto size-12 text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground">Chưa có người chơi nào</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Hãy là người đầu tiên!</p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {top10Data.map((entry, index) => (
                        <motion.div
                            key={entry.user_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card
                                className={cn(
                                    "relative overflow-hidden transition-all",
                                    entry.isCurrentUser && "ring-2 ring-primary shadow-lg shadow-primary/20"
                                )}
                            >
                                {/* Gradient accent */}
                                <div
                                    className={cn(
                                        "absolute left-0 top-0 bottom-0 w-1",
                                        entry.rank <= 3
                                            ? `bg-gradient-to-b ${getMedalColor(entry.rank)}`
                                            : "bg-gradient-to-b from-muted-foreground/30 to-muted-foreground/10"
                                    )}
                                />

                                <div className="relative flex items-center gap-3 p-3">
                                    {/* Rank Badge */}
                                    <div
                                        className={cn(
                                            "flex items-center justify-center size-12 rounded-lg shrink-0",
                                            `bg-gradient-to-br ${getMedalColor(entry.rank)}`,
                                            entry.rank <= 3 ? "shadow-md" : ""
                                        )}
                                    >
                                        {entry.rank <= 3 ? (
                                            getMedalIcon(entry.rank)
                                        ) : (
                                            <span className="text-sm font-bold text-muted-foreground">{entry.rank}</span>
                                        )}
                                    </div>

                                    {/* Avatar */}
                                    <Avatar className="size-12 border-2 border-border">
                                        <AvatarImage src={entry.avatar_url || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-muted to-muted/50 text-xs font-semibold">
                                            {getInitials(entry.username, entry.display_name)}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                        <p
                                            className={cn(
                                                "font-bold text-base truncate",
                                                entry.isCurrentUser && "text-primary"
                                            )}
                                        >
                                            {entry.isCurrentUser ? "Bạn" : getName(entry.username, entry.display_name)}
                                        </p>
                                        {entry.isCurrentUser && (
                                            <span className="inline-flex items-center gap-1 text-xs text-primary/80">
                                                <Sparkles className="size-3" />
                                                Hạng của bạn
                                            </span>
                                        )}
                                    </div>

                                    {/* Score */}
                                    <div className="text-right">
                                        <div className="font-bold text-2xl text-orange-600">
                                            {entry.high_score.toLocaleString()}
                                        </div>
                                        <span className="text-xs text-muted-foreground">điểm</span>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Current User Rank (if not in top 10) */}
            {showUserRankSeparately && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-4 border-t border-border"
                >
                    <p className="text-sm text-muted-foreground mb-3 text-center">Hạng của bạn</p>
                    <Card className="ring-2 ring-primary shadow-lg shadow-primary/20">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60" />
                        <div className="relative flex items-center gap-3 p-3">
                            <div className="flex items-center justify-center size-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 shrink-0 shadow-md">
                                <span className="text-base font-bold text-primary-foreground">#{userRank.rank}</span>
                            </div>

                            <Avatar className="size-12 border-2 border-primary">
                                <AvatarImage src={user?.user_metadata?.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-xs font-semibold">
                                    {user?.user_metadata?.username?.slice(0, 2).toUpperCase() || "ME"}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                                <p className="font-bold text-base text-primary">Bạn</p>
                                <span className="inline-flex items-center gap-1 text-xs text-primary/80">
                                    <Sparkles className="size-3" />
                                    Tiếp tục cố gắng!
                                </span>
                            </div>

                            <div className="text-right">
                                <div className="font-bold text-2xl text-primary">
                                    {userRank.score.toLocaleString()}
                                </div>
                                <span className="text-xs text-muted-foreground">điểm</span>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}
        </div>
    );
};

export default GameLeaderboard;
