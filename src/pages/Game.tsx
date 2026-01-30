import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Zap, Trophy, Target, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import GameLeaderboard from "@/components/game/GameLeaderboard";

const games = [
    {
        id: "word-defense",
        title: "Thủ thành từ vựng",
        description: "Ngăn chặn quái vật bằng cách dịch từ chính xác",
        icon: Zap,
        color: "from-blue-500 to-cyan-500",
        status: "active" as const,
    },
    {
        id: "pronunciation-challenge",
        title: "Thử thách phát âm",
        description: "Luyện phát âm chuẩn với AI",
        icon: Target,
        color: "from-purple-500 to-pink-500",
        status: "coming-soon" as const,
    },
    {
        id: "speed-quiz",
        title: "Quiz tốc độ",
        description: "Trả lời nhanh để ghi điểm cao",
        icon: Trophy,
        color: "from-orange-500 to-red-500",
        status: "coming-soon" as const,
    },
    {
        id: "super-slime",
        title: "Super Slime",
        description: "Chạy và nhảy cùng Slime xanh (Mario Style)",
        icon: Gamepad2,
        color: "from-green-500 to-lime-500",
        status: "active" as const,
    },
    {
        id: "listening-game",
        title: "Nghe hiểu",
        description: "Luyện nghe và chọn đáp án đúng",
        icon: Gamepad2,
        color: "from-green-500 to-emerald-500",
        status: "coming-soon" as const,
    },
];

const Game = () => {
    const navigate = useNavigate();
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    return (
        <div className="py-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center mb-4">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                        <Gamepad2 className="size-8" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold">Trò chơi học tập</h1>
                <p className="text-muted-foreground">
                    Học tiếng Anh vui vẻ qua các trò chơi thú vị
                </p>
            </div>

            {/* Games Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
                {games.map((game, index) => (
                    <motion.div
                        key={game.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card
                            className={cn(
                                "relative overflow-hidden transition-all hover:shadow-lg",
                                game.status === "coming-soon" && "opacity-75"
                            )}
                        >
                            {/* Background Gradient */}
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-br opacity-10",
                                game.color
                            )} />

                            <div className="relative p-6 space-y-4">
                                {/* Header with Icon and Trophy Button */}
                                <div className="flex items-start justify-between gap-3">
                                    {/* Icon */}
                                    <div className={cn(
                                        "flex size-14 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                                        game.color
                                    )}>
                                        <game.icon className="size-7" />
                                    </div>

                                    {/* Leaderboard Button - Only for Word Defense */}
                                    {game.id === "word-defense" && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setShowLeaderboard(true)}
                                            className="shrink-0"
                                            title="Xem bảng xếp hạng"
                                        >
                                            <Trophy className="size-4" />
                                        </Button>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-bold">{game.title}</h3>
                                        {game.status === "coming-soon" && (
                                            <Lock className="size-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {game.description}
                                    </p>
                                </div>

                                {/* Play Button (full width) */}
                                <Button
                                    className="w-full"
                                    disabled={game.status === "coming-soon"}
                                    onClick={() => navigate(`/game/${game.id}`)}
                                >
                                    {game.status === "coming-soon" ? "Sắp ra mắt" : "Chơi ngay"}
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Info Card */}
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Gamepad2 className="size-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-semibold">Đang phát triển</h3>
                        <p className="text-sm text-muted-foreground">
                            Các trò chơi học tập đang được phát triển và sẽ sớm ra mắt.
                            Hãy quay lại sau để trải nghiệm nhé! 🎮
                        </p>
                    </div>
                </div>
            </Card>

            {/* Word Defense Leaderboard Dialog */}
            <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard} modal={false}>
                <DialogContent className="sm:max-w-md max-h-[70vh] flex flex-col p-0">
                    <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                        <DialogTitle className="sr-only">
                            Bảng xếp hạng Thủ thành từ vựng
                        </DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto px-6 pb-6">
                        <GameLeaderboard
                            gameId="word-defense"
                            gameName="Thủ thành từ vựng"
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Custom Overlay for non-modal Dialog */}
            {showLeaderboard && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    onClick={() => setShowLeaderboard(false)}
                    aria-hidden="true"
                />
            )}
        </div >
    );
};

export default Game;
