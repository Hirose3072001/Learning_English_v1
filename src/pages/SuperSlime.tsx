import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// --- Constants & Config ---
const GRAVITY = 0.5;
const JUMP_FORCE = -16; // Increased jump
const MOVE_SPEED = 6;
const ENEMY_SPEED = 2;
const LEVEL_LENGTH = 5000;
const VIRTUAL_WIDTH = 800; // Reference width for game logic
const VIRTUAL_HEIGHT = 700; // Reference height for game logic
const GROUND_Y_OFFSET = 50; // Distance from bottom of screen to ground top

// --- Assets ---
// --- Assets ---
const HERO_Idle = "/mario_idle.png";
const HERO_Run = "/mario_run.png";
const HERO_Jump = "/mario_jump.png";
const ENEMY_Img = "/monster_up.png"; // Assuming Pink/Default
const COIN_Img = "/monster_yellow_up.png"; // Assuming Yellow
const GROUND_Img = "/ground_texture_v2.png";

interface Entity {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    type?: "ground" | "block" | "pipe" | "brick";
    active?: boolean; // for coins/enemies
    vx?: number;      // for enemies
    vy?: number;
}

const SuperSlime = () => {
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<"start" | "playing" | "gameover" | "win">("start");
    const [score, setScore] = useState(0);
    const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    // Computed values
    const canvasWidth = screenSize.width;
    const canvasHeight = screenSize.height;
    const groundY = canvasHeight - GROUND_Y_OFFSET - 50; // Fixed height from bottom

    // --- Game State Refs ---
    // Using Refs for mutable state to avoid React render loop issues in game loop
    const stateRef = useRef({
        camera: { x: 0 },
        player: {
            x: 100,
            y: 100,
            width: 68,
            height: 98,
            vx: 0,
            vy: 0,
            grounded: false,
            dead: false,
            facingRight: true,
        },
        keys: {} as { [key: string]: boolean },
        jumpLocked: false, // Prevent bunny hopping
        entities: {
            platforms: [] as Entity[],
            enemies: [] as Entity[],
            coins: [] as Entity[],
            decor: [] as Entity[], // Clouds, bushes
        },
    });

    const imagesRef = useRef({
        heroIdle: new Image(),
        heroRun: new Image(),
        heroJump: new Image(),
        enemy: new Image(),
        coin: new Image(),
        ground: new Image(),
    });

    // --- Initialization ---
    useEffect(() => {
        // Load Images
        imagesRef.current.heroIdle.src = HERO_Idle;
        imagesRef.current.heroRun.src = HERO_Run;
        imagesRef.current.heroJump.src = HERO_Jump;
        imagesRef.current.enemy.src = ENEMY_Img;
        imagesRef.current.coin.src = COIN_Img;
        imagesRef.current.ground.onload = () => console.log("Ground texture loaded!", imagesRef.current.ground.naturalWidth, imagesRef.current.ground.naturalHeight);
        imagesRef.current.ground.onerror = (e) => console.error("Ground texture failed to load", e);
        imagesRef.current.ground.src = GROUND_Img;

        // Resize Listener
        const handleResize = () => {
            setScreenSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener("resize", handleResize);

        // Load Level
        resetLevel();

        // Input Listeners
        const onKeyDown = (e: KeyboardEvent) => {
            stateRef.current.keys[e.code] = true;
            stateRef.current.keys[e.key] = true;
        };
        const onKeyUp = (e: KeyboardEvent) => {
            stateRef.current.keys[e.code] = false;
            stateRef.current.keys[e.key] = false;
        };
        const onBlur = () => { stateRef.current.keys = {}; }; // Reset keys on blur

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", onBlur);

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("blur", onBlur);
        };
    }, []);

    const resetLevel = () => {
        const s = stateRef.current;

        // Reset Player
        s.player = { x: 100, y: groundY - 200, width: 68, height: 98, vx: 0, vy: 0, grounded: false, dead: false, facingRight: true };
        s.camera.x = 0;

        // Generate simple level
        s.entities.platforms = [];
        s.entities.enemies = [];
        s.entities.coins = [];

        // 1. Ground - Continuous
        s.entities.platforms.push({
            id: Math.random(),
            x: 0,
            y: groundY,
            width: LEVEL_LENGTH,
            height: 1000, // Very deep ground to cover bottom
            type: "ground",
        });
        // End wall
        s.entities.platforms.push({ id: 9999, x: LEVEL_LENGTH, y: 0, width: 50, height: groundY + 100, type: "block" });

        // 2. Platforms & Pipes
        for (let x = 600; x < LEVEL_LENGTH - 500; x += 300 + Math.random() * 200) {
            const type = Math.random();
            if (type < 0.4) {
                // High Platform
                s.entities.platforms.push({ id: Math.random(), x: x, y: groundY - 180, width: 200, height: 30, type: "brick" });
                // Coin on top
                s.entities.coins.push({ id: Math.random(), x: x + 80, y: groundY - 240, width: 40, height: 40, active: true });
            } else if (type < 0.6) {
                // Pipe
                s.entities.platforms.push({ id: Math.random(), x: x, y: groundY - 120, width: 90, height: 120, type: "pipe" });
                // Enemy walking near pipe
                s.entities.enemies.push({ id: Math.random(), x: x + 150, y: groundY - 70, width: 60, height: 60, active: true, vx: -ENEMY_SPEED });
            } else {
                // Ground Enemy
                s.entities.enemies.push({ id: Math.random(), x: x, y: groundY - 70, width: 60, height: 60, active: true, vx: -ENEMY_SPEED });
            }
        }
    };

    // --- Game Loop ---
    useEffect(() => {
        if (gameState !== "playing") return;

        let rafId: number;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const loop = () => {
            update();
            draw(ctx);
            if (gameState === "playing") {
                rafId = requestAnimationFrame(loop);
            }
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [gameState]);

    // --- Update Logic ---
    const update = () => {
        const { player, keys, entities, camera } = stateRef.current;
        if (player.dead) return;

        // 1. Controls
        if (keys["ArrowRight"] || keys["KeyD"]) { player.vx = MOVE_SPEED; player.facingRight = true; }
        else if (keys["ArrowLeft"] || keys["KeyA"]) { player.vx = -MOVE_SPEED; player.facingRight = false; }
        else { player.vx *= 0.8; if (Math.abs(player.vx) < 0.5) player.vx = 0; }

        const jumpKeyPressed = keys["Space"] || keys["ArrowUp"] || keys["KeyW"] || keys["w"] || keys["W"] || keys["ư"] || keys["Ư"];

        if (jumpKeyPressed) {
            if (!stateRef.current.jumpLocked && player.grounded) {
                player.vy = JUMP_FORCE;
                player.grounded = false;
                stateRef.current.jumpLocked = true;
            }
        } else {
            stateRef.current.jumpLocked = false;
        }

        // 2. Physics (Player)
        player.vy += GRAVITY;
        player.x += player.vx;

        // H-Collision
        checkPlatformCollisions(player, entities.platforms, "x");

        player.y += player.vy;
        // V-Collision
        player.grounded = false;
        checkPlatformCollisions(player, entities.platforms, "y");

        // Limits
        if (player.y > canvasHeight + 100) die();
        // Cannot go left of start
        if (player.x < 0) player.x = 0;

        // 3. Camera Follow
        // Target camera position is centered on player, but clamped
        let targetCamX = player.x - 200;
        if (targetCamX < 0) targetCamX = 0;
        if (targetCamX > LEVEL_LENGTH - canvasWidth) targetCamX = LEVEL_LENGTH - canvasWidth;
        // Smooth Lerp
        camera.x += (targetCamX - camera.x) * 0.1;

        // 4. Entities (Enemies)
        entities.enemies.forEach(enemy => {
            if (!enemy.active) return;
            // Simple patrol
            enemy.vy = (enemy.vy || 0) + GRAVITY;
            enemy.x += (enemy.vx || 0);
            enemy.y += enemy.vy;

            // Enemy collisions
            let eGrounded = false;
            entities.platforms.forEach(plat => {
                if (rectIntersect(enemy, plat)) {
                    if (rectIntersect({ ...enemy, y: enemy.y - enemy.vy }, plat)) {
                        // Horizontal hit - turn around
                        enemy.vx = -(enemy.vx || 0);
                        enemy.x += (enemy.vx || 0) * 2;
                    } else {
                        // Vertical hit
                        if (enemy.vy! > 0) { // Landing
                            enemy.y = plat.y - enemy.height;
                            enemy.vy = 0;
                            eGrounded = true;
                        }
                    }
                }
            });
            // Platform detection (turn around if about to fall)
            // (Simplified: just turn around randomly or on walls)

            // Player vs Enemy
            if (rectIntersect(player, enemy)) {
                // Kill enemy if falling roughly on top
                const hitFromTop = (player.vy > 0) && (player.y + player.height < enemy.y + enemy.height / 2);

                if (hitFromTop) {
                    enemy.active = false;
                    player.vy = -8; // Bounce
                    setScore(s => s + 100);
                } else {
                    die();
                }
            }
        });

        // 5. Coins
        entities.coins.forEach(coin => {
            if (coin.active && rectIntersect(player, coin)) {
                coin.active = false;
                setScore(s => s + 50);
            }
        });

        // 6. Win Condition
        if (player.x >= LEVEL_LENGTH - 100) {
            setGameState("win");
        }
    };

    const checkPlatformCollisions = (ent: any, platforms: Entity[], axis: "x" | "y") => {
        platforms.forEach(plat => {
            if (rectIntersect(ent, plat)) {
                if (axis === "x") {
                    if (ent.vx > 0) ent.x = plat.x - ent.width;
                    else if (ent.vx < 0) ent.x = plat.x + plat.width;
                    ent.vx = 0;
                } else {
                    if (ent.vy > 0) { // Landing
                        ent.y = plat.y - ent.height;
                        ent.grounded = true;
                        ent.vy = 0;
                    } else if (ent.vy < 0) { // Head bump
                        ent.y = plat.y + plat.height;
                        ent.vy = 0;
                    }
                }
            }
        });
    };

    const rectIntersect = (r1: any, r2: any) => {
        return !(r2.x >= r1.x + r1.width ||
            r2.x + r2.width <= r1.x ||
            r2.y >= r1.y + r1.height ||
            r2.y + r2.height <= r1.y);
    };

    const die = () => {
        stateRef.current.player.dead = true;
        setGameState("gameover");
    };

    // --- Rendering ---
    const draw = (ctx: CanvasRenderingContext2D) => {
        const { camera, player, entities } = stateRef.current;
        const imgs = imagesRef.current;

        // 1. Clear & Sky
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        grad.addColorStop(0, "#60A5FA"); // Sky 400
        grad.addColorStop(1, "#93C5FD"); // Sky 300
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Camera Transform
        ctx.save();
        ctx.translate(-Math.floor(camera.x), 0);

        // 2. Platforms
        entities.platforms.forEach(p => {
            if (!isOnScreen(p, camera.x)) return;

            if (p.type === "ground") {
                if (imgs.ground.complete && imgs.ground.naturalWidth > 0) {
                    const scale = 0.5;
                    const textureHeight = imgs.ground.naturalHeight * scale;

                    // 1. Draw solid dirt color for the entire ground area first
                    ctx.fillStyle = "#5D4037"; // Matching dirt color
                    ctx.fillRect(p.x, p.y + textureHeight / 2, p.width, p.height);

                    // 2. Draw scaled texture pattern ONLY HORIZONTALLY at the top
                    const pattern = ctx.createPattern(imgs.ground, "repeat-x");
                    if (pattern) {
                        const matrix = new DOMMatrix();
                        matrix.scaleSelf(scale, scale);
                        pattern.setTransform(matrix);

                        ctx.fillStyle = pattern;
                        ctx.save();
                        ctx.translate(p.x, p.y);
                        // Fill only the top slice with the grass/dirt transition texture
                        ctx.fillRect(0, 0, p.width, textureHeight);
                        ctx.restore();
                    }
                } else {
                    ctx.fillStyle = "#15803d";
                    ctx.fillRect(p.x, p.y, p.width, p.height);
                }
            } else if (p.type === "brick") {
                ctx.fillStyle = "#b45309"; // Amber 700
                ctx.fillRect(p.x, p.y, p.width, p.height);
                // Brick details
                ctx.strokeStyle = "#78350f";
                ctx.strokeRect(p.x, p.y, p.width, p.height);
            } else if (p.type === "pipe") {
                ctx.fillStyle = "#22c55e"; // Green 500
                ctx.fillRect(p.x, p.y, p.width, p.height);
                // Pipe rim
                ctx.fillStyle = "#16a34a"; // Green 600
                ctx.fillRect(p.x - 5, p.y, p.width + 10, 20);
            } else {
                ctx.fillStyle = "#333";
                ctx.fillRect(p.x, p.y, p.width, p.height);
            }
        });

        // 3. Coins
        entities.coins.forEach(c => {
            if (!c.active || !isOnScreen(c, camera.x)) return;
            ctx.drawImage(imgs.coin, c.x, c.y, c.width, c.height);
        });

        // 4. Enemies
        entities.enemies.forEach(e => {
            if (!e.active || !isOnScreen(e, camera.x)) return;
            ctx.drawImage(imgs.enemy, e.x, e.y, e.width, e.height);
        });

        // 5. Flag (End)
        ctx.fillStyle = "#facc15"; // Yellow pole
        ctx.fillRect(LEVEL_LENGTH - 50, groundY - 300, 10, 300);
        ctx.fillStyle = "red"; // Flag
        ctx.beginPath();
        ctx.moveTo(LEVEL_LENGTH - 40, groundY - 300);
        ctx.lineTo(LEVEL_LENGTH + 40, groundY - 280);
        ctx.lineTo(LEVEL_LENGTH - 40, groundY - 260);
        ctx.fill();

        // 6. Player
        ctx.save();

        // Determine Sprite
        let heroSprite = imgs.heroIdle;
        if (!player.grounded) {
            heroSprite = imgs.heroJump;
        } else if (Math.abs(player.vx) > 0.1) {
            heroSprite = imgs.heroRun;
        }

        if (!player.facingRight) {
            ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
            ctx.scale(-1, 1);
            ctx.drawImage(
                heroSprite,
                -player.width / 2,
                -player.height / 2,
                player.width,
                player.height
            );
        } else {
            ctx.drawImage(
                heroSprite,
                player.x,
                player.y,
                player.width,
                player.height
            );
        }
        ctx.restore();

        ctx.restore();
    };

    const isOnScreen = (ent: Entity, camX: number) => {
        return ent.x + ent.width > camX && ent.x < camX + canvasWidth;
    };

    const handleStart = () => {
        setGameState("playing");
        setScore(0);
        resetLevel();
    };

    return (
        <div className="fixed inset-0 h-[100dvh] w-full flex flex-col items-center justify-between bg-blue-400 font-sans overflow-hidden touch-none">
            {/* UI Overlay - Score */}
            <div className="absolute top-4 right-4 z-10 flex gap-4 pointer-events-none">
                <div className="bg-white/90 px-4 py-1 rounded-full font-bold text-amber-600 border-2 border-amber-400 flex items-center gap-2 shadow-lg">
                    <img src={COIN_Img} className="w-6 h-6" alt="Coin" />
                    {score}
                </div>
            </div>

            {/* Game Canvas Area - Shrinks to fit */}
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center bg-blue-400">
                <canvas
                    ref={canvasRef}
                    width={canvasWidth}
                    height={canvasHeight}
                    className="max-w-full max-h-full object-cover"
                />

                {/* Start / Game Over Overlay */}
                {gameState !== "playing" && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-30">
                        <Card className="p-8 max-w-sm w-full text-center space-y-6 border-4 border-primary/20 bg-background/95 shadow-xl">
                            <h1 className="text-4xl font-black text-primary mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-600">
                                {gameState === "gameover" ? "GAME OVER" : gameState === "win" ? "VICTORY!" : "Super Slime"}
                            </h1>

                            {gameState === "gameover" ? (
                                <>
                                    <p className="text-muted-foreground">Điểm số: {score}</p>
                                    <Button size="lg" className="w-full text-xl h-14" onClick={handleStart}>
                                        <RefreshCw className="mr-2 size-5" /> Thử lại
                                    </Button>
                                </>
                            ) : gameState === "win" ? (
                                <>
                                    <Trophy className="size-20 text-yellow-500 mx-auto animate-bounce" />
                                    <p className="text-muted-foreground">Bạn đã về đích!</p>
                                    <p className="text-2xl font-bold">Điểm số: {score}</p>
                                    <Button size="lg" className="w-full text-xl h-14" onClick={handleStart}>
                                        <RefreshCw className="mr-2 size-5" /> Chơi lại
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4 text-left p-4 bg-muted/50 rounded-lg text-sm">
                                        <div>⬅️ ➡️</div> <div>Di chuyển</div>
                                        <div>SPACE</div> <div>Nhảy</div>
                                        <div>⬇️</div> <div>Ngồi</div>
                                    </div>
                                    <Button size="lg" className="w-full text-xl animate-pulse h-14" onClick={handleStart}>
                                        START GAME
                                    </Button>
                                </>
                            )}
                        </Card>
                    </div>
                )}
            </div>

            {/* Controls Area - Dedicated Bottom Panel (Mobile Only) */}
            <div className="w-full bg-slate-800 p-6 pb-24 flex items-start justify-between gap-8 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-20 shrink-0 border-t-4 border-slate-700 xl:hidden">
                {/* D-Pad: Left & Right */}
                <div className="flex items-center gap-4">
                    <Button
                        size="icon"
                        variant="secondary"
                        style={{ touchAction: "none" }}
                        className="size-20 rounded-full bg-slate-700 border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 transition-all"
                        onPointerDown={(e) => { e.preventDefault(); stateRef.current.keys["ArrowLeft"] = true; }}
                        onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys["ArrowLeft"] = false; }}
                        onPointerLeave={(e) => { e.preventDefault(); stateRef.current.keys["ArrowLeft"] = false; }}
                    >
                        <ArrowLeft className="size-10 text-slate-300" />
                    </Button>
                    <Button
                        size="icon"
                        variant="secondary"
                        style={{ touchAction: "none" }}
                        className="size-20 rounded-full bg-slate-700 border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 transition-all"
                        onPointerDown={(e) => { e.preventDefault(); stateRef.current.keys["ArrowRight"] = true; }}
                        onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys["ArrowRight"] = false; }}
                        onPointerLeave={(e) => { e.preventDefault(); stateRef.current.keys["ArrowRight"] = false; }}
                    >
                        <ArrowLeft className="size-10 text-slate-300 rotate-180" />
                    </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-end">
                    <Button
                        size="icon"
                        style={{ touchAction: "none" }}
                        className="size-20 rounded-full bg-red-500 border-b-4 border-red-800 active:border-b-0 active:translate-y-1 active:bg-red-600 transition-all shadow-lg"
                        onPointerDown={(e) => { e.preventDefault(); stateRef.current.keys["Space"] = true; }}
                        onPointerUp={(e) => { e.preventDefault(); stateRef.current.keys["Space"] = false; }}
                        onPointerLeave={(e) => { e.preventDefault(); stateRef.current.keys["Space"] = false; }}
                    >
                        <span className="text-xl font-black text-red-900/50">A</span>
                        <ArrowLeft className="size-10 text-white rotate-90 absolute" />
                    </Button>
                </div>
            </div>

            <p className="absolute bottom-52 w-full text-center text-white/50 text-xs pointer-events-none md:hidden">
                Tip: Nhảy lên đầu quái vật để tiêu diệt chúng!
            </p>
        </div>
    );
};

export default SuperSlime;
