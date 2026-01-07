import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardUser {
  rank: number;
  name: string;
  xp: number;
  avatar: string;
}

const leaderboardData: LeaderboardUser[] = [
  { rank: 1, name: "Minh Anh", xp: 15420, avatar: "MA" },
  { rank: 2, name: "Hoàng Nam", xp: 14850, avatar: "HN" },
  { rank: 3, name: "Thu Hà", xp: 13200, avatar: "TH" },
  { rank: 4, name: "Văn Đức", xp: 11800, avatar: "VD" },
  { rank: 5, name: "Lan Phương", xp: 10500, avatar: "LP" },
  { rank: 6, name: "Quốc Huy", xp: 9800, avatar: "QH" },
  { rank: 7, name: "Mai Linh", xp: 8900, avatar: "ML" },
  { rank: 8, name: "Đức Thắng", xp: 8200, avatar: "ĐT" },
  { rank: 9, name: "Bạn", xp: 500, avatar: "B" },
  { rank: 10, name: "Hồng Ngọc", xp: 450, avatar: "HN" },
];

const Leaderboard = () => {
  return (
    <div className="py-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <Trophy className="mx-auto size-12 text-gold" fill="currentColor" />
        <h1 className="mt-2 text-2xl font-bold">Bảng xếp hạng</h1>
        <p className="text-muted-foreground">Tuần này</p>
      </div>

      {/* Top 3 Podium */}
      <div className="mb-6 flex items-end justify-center gap-2">
        {/* Second Place */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center"
        >
          <Avatar className="size-16 border-4 border-secondary">
            <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">
              {leaderboardData[1].avatar}
            </AvatarFallback>
          </Avatar>
          <div className="mt-2 flex size-8 items-center justify-center rounded-full bg-secondary">
            <span className="text-sm font-bold text-secondary-foreground">2</span>
          </div>
          <p className="mt-1 text-sm font-semibold">{leaderboardData[1].name}</p>
          <p className="text-xs text-muted-foreground">{leaderboardData[1].xp.toLocaleString()} XP</p>
        </motion.div>

        {/* First Place */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center"
        >
          <Crown className="mb-1 size-8 text-gold" fill="currentColor" />
          <Avatar className="size-20 border-4 border-gold">
            <AvatarFallback className="bg-gold text-gold-foreground font-bold text-lg">
              {leaderboardData[0].avatar}
            </AvatarFallback>
          </Avatar>
          <div className="mt-2 flex size-8 items-center justify-center rounded-full bg-gold">
            <span className="text-sm font-bold text-gold-foreground">1</span>
          </div>
          <p className="mt-1 font-bold">{leaderboardData[0].name}</p>
          <p className="text-sm font-semibold text-gold">{leaderboardData[0].xp.toLocaleString()} XP</p>
        </motion.div>

        {/* Third Place */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center"
        >
          <Avatar className="size-16 border-4 border-warning">
            <AvatarFallback className="bg-warning text-warning-foreground font-bold">
              {leaderboardData[2].avatar}
            </AvatarFallback>
          </Avatar>
          <div className="mt-2 flex size-8 items-center justify-center rounded-full bg-warning">
            <span className="text-sm font-bold text-warning-foreground">3</span>
          </div>
          <p className="mt-1 text-sm font-semibold">{leaderboardData[2].name}</p>
          <p className="text-xs text-muted-foreground">{leaderboardData[2].xp.toLocaleString()} XP</p>
        </motion.div>
      </div>

      {/* Rest of the list */}
      <Card className="overflow-hidden">
        {leaderboardData.slice(3).map((user, index) => (
          <motion.div
            key={user.rank}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
            className={cn(
              "flex items-center gap-4 border-b border-border p-4 last:border-b-0",
              user.name === "Bạn" && "bg-primary/10"
            )}
          >
            <span className="w-8 text-center font-bold text-muted-foreground">
              {user.rank}
            </span>
            <Avatar>
              <AvatarFallback className="bg-muted font-semibold">
                {user.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className={cn("font-semibold", user.name === "Bạn" && "text-primary")}>
                {user.name}
              </p>
            </div>
            <span className="font-bold text-primary">{user.xp.toLocaleString()} XP</span>
          </motion.div>
        ))}
      </Card>
    </div>
  );
};

export default Leaderboard;
