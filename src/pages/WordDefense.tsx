import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Trophy, Zap, RotateCcw, Pause, Play, Home, RefreshCw } from "lucide-react";
import { useNavigate, useBlocker, type Location } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Vocabulary {
    id: string;
    word: string;
    meaning: string;
    pronunciation?: string;
}

interface Monster {
    id: string;
    word: string;
    translation: string;
    x: number; // horizontal position (0-100%)
    y: number; // vertical position (0-100%)
    speed: number;
    frame: 0 | 1; // 0 for up, 1 for down
    type: "pink" | "green" | "yellow"; // Monster variant
}

type GameStatus = "playing" | "paused" | "gameover";

const WordDefense = () => {
    const navigate = useNavigate();
    const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(5);
    const [monsters, setMonsters] = useState<Monster[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [combo, setCombo] = useState(0);
    const [level, setLevel] = useState(1);
    const [castleDamaged, setCastleDamaged] = useState(false);
    const [showRestartConfirm, setShowRestartConfirm] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const gameLoopRef = useRef<number>();
    const spawnTimerRef = useRef<number>();
    const scoreRef = useRef(0); // Track current score reliably

    // Fetch vocabulary from database
    const { data: vocabulary } = useQuery({
        queryKey: ["vocabulary-game"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("vocabulary")
                .select("id, word, meaning, pronunciation")
                .eq("is_active", true)
                .limit(100);

            if (error) throw error;
            return data as Vocabulary[];
        },
    });

    // Sync scoreRef with score state
    useEffect(() => {
        scoreRef.current = score;
    }, [score]);

    // Prevent body scroll when game is mounted
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);

    // Auto-pause when user switches tabs or windows
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && gameStatus === "playing") {
                setGameStatus("paused");
                toast.info("Game tạm dừng");
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [gameStatus]);

    // Calculate game speed based on score - FASTER fall speed
    const getGameSpeed = useCallback(() => {
        if (score < 50) return 0.8;  // Faster start
        if (score < 100) return 1.0;
        if (score < 200) return 1.2;
        return 1.5;  // Max speed faster
    }, [score]);

    // Navigation Blocker - only block during active gameplay
    const shouldBlock = useCallback(
        ({ currentLocation, nextLocation }: { currentLocation: Location; nextLocation: Location }) =>
            gameStatus === "playing" && currentLocation.pathname !== nextLocation.pathname,
        [gameStatus]
    );

    const blocker = useBlocker(shouldBlock);

    // Auto-pause when navigation is blocked
    useEffect(() => {
        if (blocker.state === "blocked" && gameStatus === "playing") {
            setGameStatus("paused");
        }
    }, [blocker.state, gameStatus]);

    const spawnMonster = useCallback(() => {
        if (!vocabulary || vocabulary.length === 0) return;

        const randomVocab = vocabulary[Math.floor(Math.random() * vocabulary.length)];
        const useEnglish = Math.random() > 0.5;

        setMonsters((prevMonsters) => {
            // Don't spawn if we already have 5 monsters
            if (prevMonsters.length >= 5) return prevMonsters;

            // Find a position that doesn't overlap - INCREASED spacing
            let x = Math.random() * 80; // 0 to 80% to cover left side
            const minDistance = 15; // Slightly reduced to allow more spawn positions

            for (let attempts = 0; attempts < 10; attempts++) {
                const tooClose = prevMonsters.some((m) => Math.abs(m.x - x) < minDistance);
                if (!tooClose) break;
                x = Math.random() * 80;
            }

            const newMonster: Monster = {
                id: `monster-${Date.now()}-${Math.random()}`,
                word: useEnglish ? randomVocab.word : randomVocab.meaning,
                translation: useEnglish ? randomVocab.meaning : randomVocab.word,
                x: x,
                y: 5, // Start at 5% (higher up)
                speed: 0.2 * getGameSpeed(),
                frame: 0,
                type: Math.random() < 0.33 ? "pink" : (Math.random() < 0.5 ? "green" : "yellow"),
            };

            return [...prevMonsters, newMonster];
        });
    }, [vocabulary, getGameSpeed]);

    // Game loop - move monsters down
    useEffect(() => {
        if (gameStatus !== "playing") return;

        gameLoopRef.current = window.setInterval(() => {
            setMonsters((prev) => {
                const updated = prev.map((monster) => ({
                    ...monster,
                    y: monster.y + monster.speed,
                }));

                // Check for monsters that hit the battlements (at 55% - slightly deeper)
                const hitCastle = updated.filter((m) => m.y >= 55);
                if (hitCastle.length > 0) {
                    // Capture current score from ref (most reliable)
                    const finalScore = scoreRef.current;

                    setLives((l) => {
                        const newLives = Math.max(0, l - hitCastle.length);
                        if (newLives === 0) {
                            setGameStatus("gameover");

                            // Save score if it's high enough
                            const saveScore = async () => {
                                try {
                                    console.log('🎮 [WordDefense] Starting score save process...', { score: finalScore });

                                    const { data: user } = await supabase.auth.getUser();
                                    if (!user.user) {
                                        console.error('❌ [WordDefense] No user found');
                                        return;
                                    }
                                    console.log('✅ [WordDefense] User authenticated:', user.user.id);

                                    // Get current profile high_score
                                    const { data: profile, error: profileError } = await supabase
                                        .from('profiles')
                                        .select('high_score')
                                        .eq('user_id', user.user.id)
                                        .single();

                                    if (profileError) {
                                        console.error('❌ [WordDefense] Error fetching profile:', profileError);
                                    } else {
                                        console.log('✅ [WordDefense] Current profile:', profile);
                                    }

                                    const currentHighScore = profile?.high_score || 0;
                                    const isNewHighScore = finalScore > currentHighScore;
                                    console.log('📊 [WordDefense] Score comparison:', {
                                        currentScore: finalScore,
                                        currentHighScore,
                                        isNewHighScore
                                    });

                                    // Update game_scores table
                                    const { data: existing, error: existingError } = await supabase
                                        .from('game_scores' as any)
                                        .select('score')
                                        .eq('user_id', user.user.id)
                                        .eq('game_id', 'word-defense')
                                        .single() as any;

                                    if (existingError && existingError.code !== 'PGRST116') {
                                        console.error('❌ [WordDefense] Error checking existing score:', existingError);
                                    }

                                    if (!existing || finalScore > (existing?.score || 0)) {
                                        console.log('💾 [WordDefense] Updating game_scores table...');
                                        const { error: upsertError } = await supabase
                                            .from('game_scores' as any)
                                            .upsert({
                                                user_id: user.user.id,
                                                game_id: 'word-defense',
                                                score: finalScore,
                                                updated_at: new Date().toISOString()
                                            }, { onConflict: 'user_id, game_id' });

                                        if (upsertError) {
                                            console.error('❌ [WordDefense] Error upserting game_scores:', upsertError);
                                        } else {
                                            console.log('✅ [WordDefense] game_scores updated successfully');
                                        }
                                    }

                                    // Update high_score in profiles if this is a new record
                                    if (isNewHighScore) {
                                        console.log('🏆 [WordDefense] New high score! Updating profiles...');
                                        const { error: updateError } = await supabase
                                            .from('profiles')
                                            .update({ high_score: finalScore })
                                            .eq('user_id', user.user.id);

                                        if (updateError) {
                                            console.error('❌ [WordDefense] Error updating profile high_score:', updateError);
                                            toast.error("Lỗi khi lưu điểm cao: " + updateError.message);
                                        } else {
                                            console.log('✅ [WordDefense] Profile high_score updated successfully');
                                            toast.success("🏆 Kỷ lục mới! Điểm của bạn đã được lưu.");
                                        }
                                    } else if (!existing) {
                                        console.log('📝 [WordDefense] First time playing, score saved');
                                        toast.success("Điểm của bạn đã được lưu.");
                                    } else {
                                        console.log('ℹ️ [WordDefense] Score not high enough to update');
                                    }
                                } catch (err) {
                                    console.error("❌ [WordDefense] Error saving score:", err);
                                    toast.error("Lỗi khi lưu điểm: " + (err as Error).message);
                                }
                            };
                            saveScore();
                        }
                        return newLives;
                    });
                    setCombo(0); // Reset combo

                    // Trigger damage flash effect
                    setCastleDamaged(true);
                    setTimeout(() => setCastleDamaged(false), 300); // Flash for 300ms

                    // toast.error removed - no notification when losing life
                }

                // Remove monsters that hit the battlements
                return updated.filter((m) => m.y < 55);
            });
        }, 50); // 60 FPS

        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [gameStatus]);

    // Spawn monsters at intervals
    useEffect(() => {
        if (gameStatus !== "playing") return;

        const animationInterval = window.setInterval(() => {
            setMonsters((prev) => prev.map(m => ({
                ...m,
                frame: m.frame === 0 ? 1 : 0
            })));
        }, 500); // Toggle frame every 500ms

        return () => clearInterval(animationInterval);
    }, [gameStatus]);

    // Spawn monsters at intervals
    useEffect(() => {
        if (gameStatus !== "playing") return;

        const spawnInterval = 4000 - (level - 1) * 100; // SLOWER spawning, very gentle increase
        spawnTimerRef.current = window.setInterval(() => {
            spawnMonster();
        }, Math.max(2000, spawnInterval)); // Min 2s between spawns

        return () => {
            if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
        };
    }, [gameStatus, spawnMonster, level]);

    // Update level based on score
    useEffect(() => {
        const newLevel = Math.floor(score / 50) + 1;
        if (newLevel !== level) {
            setLevel(newLevel);
            toast.success(`🎉 Level ${newLevel}!`);
        }
    }, [score, level]);

    // Handle input change - just update the value
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    // Check answer when Enter is pressed
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return;

        const value = inputValue.trim();
        if (value === "") return;

        // Check if input matches any monster's translation (case-insensitive)
        const matchedMonster = monsters.find(
            (m) => m.translation.toLowerCase() === value.toLowerCase()
        );

        if (matchedMonster) {
            // Correct answer!
            const newCombo = combo + 1;
            const multiplier = Math.min(1 + newCombo * 0.5, 3); // Max 3x
            const points = Math.round(10 * multiplier);

            setScore((s) => s + points);
            setCombo(newCombo);
            setMonsters((prev) => prev.filter((m) => m.id !== matchedMonster.id));
            setInputValue("");

            // Blur input to dismiss mobile keyboard
            inputRef.current?.blur();
            // Re-focus after a short delay to keep input ready
            setTimeout(() => inputRef.current?.focus(), 100);

            // toast.success removed - no notification when scoring
        } else {
            // Wrong answer - shake input and clear
            // toast.error removed - no notification for wrong answer
            setInputValue("");

            // Blur input to dismiss mobile keyboard
            inputRef.current?.blur();
            // Re-focus after a short delay
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    // Focus input on mount and when game status changes
    useEffect(() => {
        if (gameStatus === "playing" && inputRef.current) {
            inputRef.current.focus();
        }
    }, [gameStatus]);

    // Restart game
    const restartGame = () => {
        setGameStatus("playing");
        setScore(0);
        scoreRef.current = 0; // Reset ref too
        setLives(5);
        setMonsters([]);
        setInputValue("");
        setCombo(0);
        setLevel(1);
        setShowRestartConfirm(false);
    };

    const requestRestart = () => {
        if (gameStatus === "playing") setGameStatus("paused");
        setShowRestartConfirm(true);
    };

    const cancelRestart = () => {
        setShowRestartConfirm(false);
    };

    // Toggle pause
    const togglePause = () => {
        setGameStatus((s) => (s === "playing" ? "paused" : "playing"));
    };

    if (!vocabulary || vocabulary.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Đang tải từ vựng...</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden bg-gradient-to-b from-sky-400 to-sky-200 dark:from-sky-900 dark:to-sky-700" style={{ height: "calc(100vh - 60px)" }}>
            {/* Game Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/20 to-transparent">
                {/* Level Display - Centered Top */}


                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    {/* Lives */}
                    <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Heart
                                key={i}
                                className={cn(
                                    "size-6",
                                    i < lives ? "fill-red-500 text-red-500" : "fill-gray-400 text-gray-400"
                                )}
                            />
                        ))}
                    </div>

                    {/* Wave & Score */}
                    <div className="flex items-center gap-2">
                        {/* Wave Badge */}
                        <div className="bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-full shadow-sm">
                            <span className="font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                Đợt {level}
                            </span>
                        </div>

                        {/* Score Badge */}
                        <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-full shadow-sm">
                            <Trophy className="size-5 text-yellow-500" />
                            <span className="font-bold text-lg">{score}</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <Button
                            size="icon"
                            variant="secondary"
                            onClick={togglePause}
                            className="rounded-full"
                        >
                            {gameStatus === "playing" ? <Pause className="size-4" /> : <Play className="size-4" />}
                        </Button>
                        <Button
                            size="icon"
                            variant="secondary"
                            onClick={() => {
                                if (gameStatus === "playing") setGameStatus("paused");
                                setShowRestartConfirm(true);
                            }}
                            className="rounded-full"
                        >
                            <RefreshCw className="size-4" />
                        </Button>
                    </div>
                </div>


            </div>

            {/* Game Area */}
            <div className="relative h-full w-full">
                <AnimatePresence>
                    {gameStatus === "playing" && monsters.map((monster) => (
                        <motion.div
                            key={monster.id}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0, rotate: 360 }}
                            style={{
                                position: "absolute",
                                left: `${monster.x}%`,
                                top: `${monster.y}%`,
                                transform: "translate(-50%, -50%)",
                                zIndex: Math.floor(monster.y * 10), // Higher y = higher z-index (monsters near castle on top)
                            }}
                        >
                            <div className="flex flex-col items-center">
                                <img
                                    src={
                                        monster.type === "green"
                                            ? (monster.frame === 0 ? "/monster_green_up.png" : "/monster_green_down.png")
                                            : monster.type === "yellow"
                                                ? (monster.frame === 0 ? "/monster_yellow_up.png" : "/monster_yellow_down.png")
                                                : (monster.frame === 0 ? "/monster_up.png" : "/monster_down.png")
                                    }
                                    alt="monster"
                                    className="w-24 h-24 object-contain filter drop-shadow-lg transition-all duration-300"
                                />

                                {/* Word Board below monster */}
                                <div className="relative mt-1 px-3 py-1 bg-stone-800 border-2 border-stone-600 rounded shadow-xl text-center min-w-[120px] max-w-[180px] z-10">
                                    <div className="text-white font-bold text-base break-words leading-tight">
                                        {monster.word}
                                    </div>
                                    {/* Decorative Bolts */}
                                    <div className="absolute top-1 left-1 w-1 h-1 bg-stone-500 rounded-full"></div>
                                    <div className="absolute top-1 right-1 w-1 h-1 bg-stone-500 rounded-full"></div>
                                    <div className="absolute bottom-1 left-1 w-1 h-1 bg-stone-500 rounded-full"></div>
                                    <div className="absolute bottom-1 right-1 w-1 h-1 bg-stone-500 rounded-full"></div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Castle Area - starts at 75% (taller castle) */}
                {/* Castle Area - Image */}
                <div className="absolute left-0 right-0 z-40 flex items-end justify-center pointer-events-none" style={{ top: "50%", bottom: 0 }}>
                    <img
                        src={castleDamaged ? "/castle_damage_v2.png" : "/castle_v2.png"}
                        alt="Castle"
                        className="w-full h-full object-cover object-top transition-all duration-100"
                    />
                </div>

                {/* Input Area - Inside Castle - larger */}
                {/* Input Area - Inside Castle - larger */}
                <div className="absolute bottom-32 left-0 right-0 px-4 z-[1000]">
                    <div className="max-w-md mx-auto">
                        <Input
                            ref={inputRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyPress={handleKeyPress}
                            placeholder="Nhập bản dịch..."
                            className="text-center text-xl font-bold h-14 bg-white dark:bg-gray-800 border-4 border-yellow-500 shadow-xl"
                            disabled={gameStatus !== "playing"}
                        />
                    </div>
                </div>
            </div>

            {/* Restart Confirmation Modal (Added) */}
            {
                showRestartConfirm && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[70]">
                        <Card className="p-8 max-w-sm w-full text-center space-y-6 border-4 border-primary/20 bg-background/95 shadow-xl">
                            <h2 className="text-2xl font-bold">Chơi lại từ đầu?</h2>
                            <p className="text-muted-foreground">Điểm số hiện tại của bạn sẽ bị mất.</p>
                            <div className="space-y-3"> {/* Changed to vertical stack for better mobile fit, or keep horizontal? Keeping horizontal to match previous code logic but user asked for size match. Vertical buttons are more mobile friendly usually, but WordRunner uses vertical. Let's stick to horizontal if it fits or switch to vertical if matching WordRunner explicitly. WordRunner uses vertical stack. Let's try to match WordRunner's vertical stack for consistency if possible, OR keep horizontal if it looks better here. I will stick to the previous horizontal layout but fix the container width first as requested. actually, WordRunner uses vertical stack (space-y-3). I'll stick to horizontal here as it was, just fixing the Card width. */}
                                <div className="flex gap-3 justify-center">
                                    <Button onClick={cancelRestart} size="lg" variant="outline" className="flex-1">
                                        Hủy
                                    </Button>
                                    <Button onClick={restartGame} size="lg" variant="default" className="bg-amber-500 hover:bg-amber-600 flex-1">
                                        <RefreshCw className="size-5 mr-2" />
                                        Chơi lại
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )
            }

            {/* Pause Overlay - Only show if NOT blocked by navigation */}
            {
                gameStatus === "paused" && blocker.state !== "blocked" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                        <Card className="p-8 max-w-sm w-full text-center space-y-6 border-4 border-primary/20 bg-background/95 shadow-xl">
                            <h2 className="text-2xl font-bold">Tạm dừng</h2>
                            <div className="flex gap-3 justify-center">
                                <Button onClick={togglePause} size="lg" variant="default" className="flex-1">
                                    <Play className="size-5 mr-2" />
                                    Tiếp tục
                                </Button>
                                <Button onClick={() => navigate("/game")} size="lg" variant="outline" className="flex-1">
                                    <Home className="size-5 mr-2" />
                                    Thoát
                                </Button>
                            </div>
                        </Card>
                    </div>
                )
            }

            {/* Exit Confirmation Modal (Navigation Blocked) */}
            {
                blocker.state === "blocked" && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[60]">
                        <Card className="p-8 max-w-sm w-full text-center space-y-6 border-4 border-primary/20 bg-background/95 shadow-xl">
                            <h2 className="text-2xl font-bold">Thoát game?</h2>
                            <p className="text-muted-foreground">Tiến trình chơi sẽ bị mất.</p>
                            <div className="flex gap-3 justify-center">
                                <Button onClick={() => blocker.reset()} size="lg" variant="default" className="flex-1">
                                    <Play className="size-5 mr-2" />
                                    Ở lại
                                </Button>
                                <Button onClick={() => blocker.proceed()} size="lg" variant="outline" className="flex-1">
                                    <Home className="size-5 mr-2" />
                                    Thoát
                                </Button>
                            </div>
                        </Card>
                    </div>
                )
            }

            {/* Game Over Modal */}
            {
                gameStatus === "gameover" && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            <Card className="p-8 max-w-sm w-full text-center space-y-6 border-4 border-primary/20 bg-background/95 shadow-xl">
                                <div className="text-6xl">💀</div>
                                <h2 className="text-3xl font-bold">Game Over!</h2>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-center gap-2 text-2xl">
                                        <Trophy className="size-8 text-yellow-500" />
                                        <span className="font-bold">{score} điểm</span>
                                    </div>
                                    <p className="text-muted-foreground">
                                        Level {level} • Combo tối đa: x{(1 + combo * 0.5).toFixed(1)}
                                    </p>
                                </div>
                                <div className="flex gap-3 justify-center">
                                    <Button onClick={restartGame} size="lg" className="flex-1 bg-green-600 hover:bg-green-700 shadow-md">
                                        <RotateCcw className="size-5 mr-2" />
                                        Chơi lại
                                    </Button>
                                    <Button onClick={() => navigate("/game")} variant="outline" size="lg" className="flex-1 shadow-sm">
                                        <Home className="size-5 mr-2" />
                                        Thoát
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                )
            }
        </div >
    );
};

export default WordDefense;
