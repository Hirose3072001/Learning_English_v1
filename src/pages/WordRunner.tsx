import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Trophy, Heart, Pause, Home, Play } from "lucide-react";
import { useNavigate, useBlocker } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
const HERO_Idle = "/mario_idle.png";
const HERO_Run = "/mario_run.png";
const HERO_Jump = "/mario_jump.png";
const ENEMY_Img = "/monster_up.png"; // Assuming Pink/Default
const COIN_Img = "/coin.png";
const GROUND_Img = "/ground_texture_v2.png";
const BRICK_Img = "/brick.png";
const QUESTION_Img = "/question.png";
const FLAG_Img = "/flag_pole_final.png";

interface Entity {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    type?: "ground" | "block" | "pipe" | "brick" | "block_brick" | "block_question" | "block_empty" | "letter" | "gate";
    active?: boolean; // for coins/enemies
    vx?: number;      // for enemies
    vy?: number;
    patrolMin?: number;
    patrolMax?: number;
    char?: string; // For letter entities
}

interface Vocabulary {
    id: string;
    word: string;
    meaning: string;
}

// This large replacement is risky, let's target the component body instead.
const WordRunner = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [gameState, setGameState] = useState<"start" | "playing" | "gameover" | "win" | "paused">("start");
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showRestartConfirm, setShowRestartConfirm] = useState(false);

    // Puzzle State
    const [targetWord, setTargetWord] = useState<Vocabulary | null>(null);
    const [collectedLetters, setCollectedLetters] = useState<string[]>([]);
    const [showPuzzle, setShowPuzzle] = useState(false);
    const [puzzleInput, setPuzzleInput] = useState<string[]>([]);

    // Fetch Vocabulary
    const { data: vocabulary } = useQuery({
        queryKey: ["vocabulary-runner"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("vocabulary")
                .select("id, word, meaning")
                .eq("is_active", true)
                .limit(20);
            if (error) throw error;
            return data as Vocabulary[];
        },
    });

    // Navigation Blocker
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            gameState === "playing" && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        if (blocker.state === "blocked") {
            setGameState("paused");
            setShowExitConfirm(true);
        }
    }, [blocker.state]);

    // Fixed values for game consistency
    const canvasWidth = 800;
    const canvasHeight = 600;
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
            lives: 3,
            invincibleUntil: 0,
        },
        keys: {} as { [key: string]: boolean },
        jumpLocked: false, // Prevent bunny hopping
        entities: {
            platforms: [] as Entity[],
            enemies: [] as Entity[],
            coins: [] as Entity[],
            letters: [] as Entity[], // New letter entities
            decor: [] as Entity[], // Clouds, bushes
        },
        flag: {
            state: "idle" as "idle" | "falling" | "fallen",
            angle: 0,
            vy: 0
        }
    });

    // Handle Unlock Logic (Moved to component scope)
    const handleUnlock = () => {
        const guess = puzzleInput.join("");
        if (!targetWord) return;

        if (guess.toUpperCase() === targetWord.word.toUpperCase()) {
            // Win!
            setGameState("win");
            setShowPuzzle(false);
            setScore(s => s + 1000);
            saveHighScore();
        } else {
            // Wrong! Trigger Trap
            setShowPuzzle(false);
            if (stateRef.current.flag) {
                stateRef.current.flag.state = "falling";
            }
            // Resume physics so flag can fall
            setGameState("playing");
            // Focus game container
            setTimeout(() => containerRef.current?.focus(), 10);
        }
    };

    const imagesRef = useRef({
        heroIdle: new Image(),
        heroRun: new Image(),
        heroJump: new Image(),
        enemy: new Image(),
        coin: new Image(),
        ground: new Image(),
        platform: new Image(),
        brick: new Image(),
        question: new Image(),
        flag: new Image(),
    });

    // --- Initialization ---
    useEffect(() => {
        // Load Images
        imagesRef.current.heroIdle.src = HERO_Idle;
        imagesRef.current.heroRun.src = HERO_Run;
        imagesRef.current.heroJump.src = HERO_Jump;
        imagesRef.current.enemy.src = ENEMY_Img;
        imagesRef.current.coin.src = COIN_Img;
        imagesRef.current.platform.src = "/platform.png"; // Load platform texture
        imagesRef.current.brick.src = BRICK_Img;
        imagesRef.current.question.src = QUESTION_Img;

        // Load Flag Only
        const flagL = new Image(); flagL.src = FLAG_Img;

        flagL.onload = () => { imagesRef.current.flag = flagL; };
        imagesRef.current.flag = flagL;

        imagesRef.current.ground.onload = () => console.log("Ground texture loaded!", imagesRef.current.ground.naturalWidth, imagesRef.current.ground.naturalHeight);
        imagesRef.current.ground.onerror = (e) => console.error("Ground texture failed to load", e);
        imagesRef.current.ground.src = GROUND_Img;

        // Load Level
        resetLevel();

        // Lock Scroll
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";

        // Input Listeners (Focus Trap)
        const container = containerRef.current;


        if (container) {
            container.focus();

            const normalizeKey = (e: KeyboardEvent) => {
                const k = e.key;
                // Map Vietnamese/Char keys to Hardware Codes
                if (['w', 'W', 'ư', 'Ư'].includes(k)) return "KeyW";
                if (['a', 'A'].includes(k)) return "KeyA";
                if (['s', 'S'].includes(k)) return "KeyS";
                if (['d', 'D'].includes(k)) return "KeyD";
                return e.code;
            };

            const onKeyDown = (e: KeyboardEvent) => {
                const code = normalizeKey(e);
                if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(code)) {
                    e.preventDefault();
                    e.stopPropagation();
                    stateRef.current.keys[code] = true;

                    // Mutual Exclusion: Reset opposing keys immediately
                    // This creates "Latest Key Priority" behavior and prevents sticky conflicting inputs
                    if (["KeyA", "ArrowLeft"].includes(code)) {
                        stateRef.current.keys["KeyD"] = false;
                        stateRef.current.keys["ArrowRight"] = false;
                    } else if (["KeyD", "ArrowRight"].includes(code)) {
                        stateRef.current.keys["KeyA"] = false;
                        stateRef.current.keys["ArrowLeft"] = false;
                    }
                }
            };

            const onKeyUp = (e: KeyboardEvent) => {
                const code = normalizeKey(e);
                if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(code)) {
                    e.preventDefault();
                    e.stopPropagation();
                    stateRef.current.keys[code] = false;
                }
            };

            const onBlur = () => {
                stateRef.current.keys = {};
                // Also reset movement specifically just in case
                stateRef.current.player.vx = 0;
            };

            // Block IME composition to prevent stutter
            const preventIME = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            };

            container.addEventListener("keydown", onKeyDown);
            // Attach keyup and blur to window to catch events even if focus is lost/cursor moves out
            window.addEventListener("keyup", onKeyUp);
            window.addEventListener("blur", onBlur);

            // Should validly block IME on the container we are focused on
            container.addEventListener("compositionstart", preventIME);
            container.addEventListener("compositionend", preventIME);

            return () => {
                document.body.style.overflow = "";
                document.documentElement.style.overflow = "";
                container.removeEventListener("keydown", onKeyDown);
                window.removeEventListener("keyup", onKeyUp);
                window.removeEventListener("blur", onBlur);
                container.removeEventListener("compositionstart", preventIME);
                container.removeEventListener("compositionend", preventIME);
            };
        }
    }, []);

    const resetLevel = () => {
        const s = stateRef.current;

        // Reset Player
        s.player = { x: 100, y: groundY - 200, width: 68, height: 98, vx: 0, vy: 0, grounded: false, dead: false, facingRight: true, lives: 3, invincibleUntil: 0 };
        s.camera.x = 0;

        // Generate simple level
        s.entities.platforms = [];
        s.entities.enemies = [];
        s.entities.coins = [];
        s.entities.letters = [];
        setCollectedLetters([]); // Reset inventory
        setShowPuzzle(false);
        s.flag = { state: "idle", angle: 0, vy: 0 };

        // Pick Target Word
        let word = "HELLO";
        if (vocabulary && vocabulary.length > 0) {
            const v = vocabulary[Math.floor(Math.random() * vocabulary.length)];
            word = v.word.toUpperCase();
            setTargetWord(v);
            setPuzzleInput(new Array(word.length).fill(""));
        } else {
            setTargetWord({ id: "default", word: "HELLO", meaning: "Xin chào" });
            setPuzzleInput(new Array(5).fill(""));
        }

        // Prepare Letters to Spawn (Target + Distractors)
        const targetChars = word.split('');
        const distractors = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').sort(() => 0.5 - Math.random()).slice(0, 5);
        const spawnPool = [...targetChars, ...distractors].sort(() => 0.5 - Math.random());
        let spawnIndex = 0;

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
        let x = 600;
        while (x < LEVEL_LENGTH - 500) {
            const gap = 250 + Math.random() * 150; // Increased Gap: 250-400px
            const type = Math.random();

            if (type < 0.3) {
                // Standard Platform
                const platWidth = 100 + Math.random() * 80;
                s.entities.platforms.push({ id: Math.random(), x: x, y: groundY - 180, width: platWidth, height: 60, type: "brick" });
                // Coin or Letter on top
                // Coin or Letter on top
                const hasMoreLetters = spawnIndex < spawnPool.length;
                if (hasMoreLetters) {
                    // Logic: Prioritize Target Characters (first N in pool conceptually, but pool is shuffled).
                    // Wait, earlier I shuffled 'spawnPool' which combines Target + Distractors. 
                    // To guarantee Target chars, I should have NOT shuffled them mixed.
                    // But 'spawnPool' is just a char array.
                    // If I pull from it sequentially and ensure I place enough 'letter entities', I will get all of them IF I have enough platforms.
                    // Strategy: FORCE letter spawn if we haven't placed all pool items yet and are running out of space? Can't predict space easily.
                    // Simpler Strategy: Always spawn letter until pool empty. No probability check for now?
                    // Or keep 100% chance for letters until empty.
                    s.entities.letters.push({
                        id: Math.random(),
                        x: x + (platWidth / 2) - 20,
                        y: groundY - 240,
                        width: 40,
                        height: 40,
                        type: "letter",
                        char: spawnPool[spawnIndex++],
                        active: true
                    });
                } else {
                    s.entities.coins.push({ id: Math.random(), x: x + (platWidth / 2) - 20, y: groundY - 240, width: 40, height: 40, active: true });
                }
                x += platWidth + gap;
            } else if (type < 0.5) {
                // QUESTION BLOCKS / BRICKS CLUSTER
                // Floating standard blocks (40x40) at y - 180 (jumpable)
                // Pattern: [?][B][?] or [B][B][B]
                const startX = x;
                const pattern = Math.random() > 0.5 ? ["block_question", "block_brick", "block_question"] : ["block_brick", "block_question", "block_brick", "block_brick"];

                pattern.forEach((bType, i) => {
                    s.entities.platforms.push({
                        id: Math.random(),
                        x: startX + (i * 50),
                        y: groundY - 200, // Higher than pipe
                        width: 50,
                        height: 50,
                        type: bType as any
                    });
                });

                // Add an enemy underneath
                s.entities.enemies.push({
                    id: Math.random(), x: startX + 50, y: groundY - 70, width: 60, height: 60, active: true, vx: -ENEMY_SPEED,
                    patrolMin: startX, patrolMax: startX + 400
                });

                // Spawn Letter above cluster if needed
                if (spawnIndex < spawnPool.length) {
                    s.entities.letters.push({
                        id: Math.random(),
                        x: startX + 50, // Center of cluster roughly
                        y: groundY - 260, // Above blocks
                        width: 40,
                        height: 40,
                        type: "letter",
                        char: spawnPool[spawnIndex++],
                        active: true
                    });
                }

                x += (pattern.length * 50) + gap;

            } else if (type < 0.7) {
                // Pipe
                const pipeW = 90;
                s.entities.platforms.push({ id: Math.random(), x: x, y: groundY - 120, width: pipeW, height: 120, type: "pipe" });
                // Enemy walking near pipe (Patrols 400px)
                const ex = x + 150;
                s.entities.enemies.push({
                    id: Math.random(), x: ex, y: groundY - 70, width: 60, height: 60, active: true, vx: -ENEMY_SPEED,
                    patrolMin: ex - 200, patrolMax: ex + 200
                });

                // Spawn Letter above Pipe if needed
                if (spawnIndex < spawnPool.length) {
                    s.entities.letters.push({
                        id: Math.random(),
                        x: x + (pipeW / 2) - 20,
                        y: groundY - 240, // Floating high above pipe
                        width: 40,
                        height: 40,
                        type: "letter",
                        char: spawnPool[spawnIndex++],
                        active: true
                    });
                }

                x += pipeW + gap;
            } else {
                // Ground Enemy area (Patrols 600px)
                s.entities.enemies.push({
                    id: Math.random(), x: x, y: groundY - 70, width: 60, height: 60, active: true, vx: -ENEMY_SPEED,
                    patrolMin: x, patrolMax: x + 600
                });

                // Spawn Letter floating in air (jump challenge)
                if (spawnIndex < spawnPool.length) {
                    s.entities.letters.push({
                        id: Math.random(),
                        x: x + 75,
                        y: groundY - 180, // Jump height
                        width: 40,
                        height: 40,
                        type: "letter",
                        char: spawnPool[spawnIndex++],
                        active: true
                    });
                }

                x += 150 + gap;
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

        const jumpKeyPressed = keys["Space"] || keys["ArrowUp"] || keys["KeyW"];

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
            // Simple patrol relative to range
            enemy.vy = (enemy.vy || 0) + GRAVITY;
            enemy.x += (enemy.vx || 0);
            enemy.y += enemy.vy;

            // Patrol Boundaries Check
            if (enemy.patrolMin !== undefined && enemy.x <= enemy.patrolMin) {
                enemy.x = enemy.patrolMin;
                enemy.vx = Math.abs(enemy.vx || 0);
            }
            if (enemy.patrolMax !== undefined && enemy.x + enemy.width >= enemy.patrolMax) {
                enemy.x = enemy.patrolMax - enemy.width;
                enemy.vx = -Math.abs(enemy.vx || 0);
            }

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
            // Use stricter hitbox for damage/kill interaction
            if (checkCollision(player, enemy, 10)) { // 10px padding
                // Kill enemy if falling and feet are above enemy center
                const enemyCenterY = enemy.y + (enemy.height / 2);
                const playerBottom = player.y + player.height;
                // Must be falling AND feet must be clearly above enemy center
                const hitFromTop = (player.vy > 0) && (playerBottom < enemyCenterY + 10);

                if (hitFromTop) {
                    enemy.active = false;
                    player.vy = -10; // Bounce
                    setScore(s => s + 100);
                    // Spawn Coin
                    entities.coins.push({
                        id: Math.random(), x: enemy.x, y: enemy.y, width: 40, height: 40, active: true
                    });
                } else {
                    takeDamage();
                }
            }
        });

        // 5. Coins
        entities.coins.forEach(coin => {
            // Require touching inner 50% of coin
            if (coin.active && checkCollision(player, coin, 15)) {
                coin.active = false;
                setScore(s => s + 50);
            }
        });

        // 6. Letters
        entities.letters.forEach(l => {
            if (l.active && checkCollision(player, l, 10)) {
                l.active = false;
                // Add to inventory
                if (l.char) {
                    setCollectedLetters(prev => [...prev, l.char!]);
                    // Sound/Particles?
                    setScore(s => s + 20);
                }
            }
        });

        // 7. Win Condition (Reach Flag)
        // Flag is at LEVEL_LENGTH - 150.
        // Only trigger if flag is stable and puzzle not already open
        if (player.x >= LEVEL_LENGTH - 200 && !showPuzzle && stateRef.current.flag.state === "idle") {
            // Stop movement
            setGameState("paused");
            // Open Puzzle
            setShowPuzzle(true);
        }

        // 8. Flag Mechanics (Falling Trap)
        const flag = stateRef.current.flag;
        if (flag.state === "falling") {
            // Fall speed accelerates (rotation speed)
            // Reduced from 0.005 to 0.002 for better visibility
            flag.vy += 0.002;
            flag.angle -= flag.vy; // Rotate left (negative)

            // Collision with Player
            // If angle is roughly hitting the player (-45 to -90 deg?)
            if (flag.angle < -0.5 && flag.angle > -2.0) {
                const fX = LEVEL_LENGTH - 150;
                if (Math.abs(player.x - (fX - 100)) < 100) { // Rough hitbox
                    if (!player.dead) {
                        takeDamage();
                    }
                }
            }

            // Ground/End limit
            if (flag.angle <= -Math.PI / 2) { // 90 degrees
                flag.angle = -Math.PI / 2;
                flag.state = "fallen";
                flag.vy = 0;
            }
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

                        // Handle Block Interaction (Only player triggers this)
                        if (plat.type === "block_brick") {
                            // Destroy Brick
                            plat.type = "destroyed" as any; // Mark for removal (or we can splice, but mutation during iteration is risky if not careful. Filter later or just mark inactive)
                            // Ideally remove from array, but for now lets move it off screen or simple active flag? 
                            // Easier: splice it out if we access array by index, but we are inside foreach. 
                            // Let's filter it out in the main update loop or just move it far away for now.
                            // Actually, let's just create a 'broken' effect? 
                            // Simple hack: Move it to y = -9999
                            plat.y = -9999;

                            // Add score/sound
                            setScore(s => s + 10);
                        } else if (plat.type === "block_question") {
                            // Hit Question Block
                            plat.type = "block_empty";
                            setScore(s => s + 50);
                            // Spawn bouncing coin
                            stateRef.current.entities.coins.push({
                                id: Math.random(),
                                x: plat.x + (plat.width / 2) - 20,
                                y: plat.y - 50,
                                width: 40,
                                height: 40,
                                active: true,
                                // Velocity animation could be handled if Coin had physics, but currently they are static.
                                // Let's just spawn it above.
                            });
                        }
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

    // Stricter collision with padding (shrinks the hitbox)
    const checkCollision = (r1: any, r2: any, padding: number) => {
        return !(r2.x + padding >= r1.x + r1.width - padding ||
            r2.x + r2.width - padding <= r1.x + padding ||
            r2.y + padding >= r1.y + r1.height - padding ||
            r2.y + r2.height - padding <= r1.y + padding);
    };

    const takeDamage = () => {
        const { player, camera } = stateRef.current;
        // Check Iframes
        if (Date.now() < player.invincibleUntil) return;

        player.lives -= 1;
        setLives(player.lives); // Sync UI
        player.invincibleUntil = Date.now() + 2000; // 2s Invulnerability for blinking effect

        if (player.lives <= 0) {
            die();
        } else {
            // Respawn Logic: Return to safe start position
            player.x = 100;
            player.y = groundY - 200;
            player.vx = 0;
            player.vy = 0;
            camera.x = 0;
            // Also reset flag
            stateRef.current.flag = { state: "idle", angle: 0, vy: 0 };
        }
    };

    const die = () => {
        stateRef.current.player.dead = true;
        setGameState("gameover");
        saveHighScore();
    };

    const saveHighScore = async () => {
        if (!user) return;
        try {
            const { data } = await supabase.from('profiles').select('high_score').eq('user_id', user.id).single();
            const currentHigh = data?.high_score || 0;
            if (score > currentHigh) {
                await supabase.from('profiles').update({ high_score: score }).eq('user_id', user.id);
            }
        } catch (e) {
            console.error("Save score failed:", e);
        }
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
                if (imgs.platform.complete && imgs.platform.naturalWidth > 0) {
                    const h = p.height;
                    const srcH = imgs.platform.naturalHeight;
                    const srcW = imgs.platform.naturalWidth;

                    // Slice definitions (source coordinates)
                    // Assuming roughly 25% caps
                    const sliceLeftW = srcW * 0.25;
                    const sliceRightW = srcW * 0.25;
                    const sliceCenterW = srcW * 0.5;
                    const sliceLeftX = 0;
                    const sliceCenterX = sliceLeftW;
                    const sliceRightX = sliceLeftW + sliceCenterW;

                    // Dest dimensions (scaled by height)
                    // We maintain aspect ratio for the caps based on source height
                    const capFactor = h / srcH;
                    const destLeftW = sliceLeftW * capFactor;
                    const destRightW = sliceRightW * capFactor;

                    // 1. Draw Left Cap
                    ctx.drawImage(imgs.platform, sliceLeftX, 0, sliceLeftW, srcH, p.x, p.y, destLeftW, h);

                    // 2. Draw Right Cap
                    ctx.drawImage(imgs.platform, sliceRightX, 0, sliceRightW, srcH, p.x + p.width - destRightW, p.y, destRightW, h);

                    // 3. Tile Center
                    const startX = p.x + destLeftW;
                    const endX = p.x + p.width - destRightW;
                    const centerWidth = endX - startX;
                    const destCenterTileW = sliceCenterW * capFactor; // Width of one center tile

                    if (centerWidth > 0) {
                        for (let x = startX; x < endX; x += destCenterTileW) {
                            const drawW = Math.min(destCenterTileW, endX - x);
                            // Calculate portion of source to draw
                            const srcDrawW = sliceCenterW * (drawW / destCenterTileW);
                            ctx.drawImage(imgs.platform, sliceCenterX, 0, srcDrawW, srcH, x, p.y, drawW, h);
                        }
                    }
                } else {
                    ctx.fillStyle = "#b45309"; // Fallback color
                    ctx.fillRect(p.x, p.y, p.width, p.height);
                    ctx.strokeStyle = "#78350f";
                    ctx.strokeRect(p.x, p.y, p.width, p.height);
                }
            } else if (p.type === "pipe") {
                ctx.fillStyle = "#22c55e"; // Green 500
                ctx.fillRect(p.x, p.y, p.width, p.height);
                // Pipe rim
                ctx.fillStyle = "#16a34a"; // Green 600
                ctx.fillRect(p.x - 5, p.y, p.width + 10, 20);
            } else if (p.type === "block_brick") {
                if (imgs.brick.complete) {
                    ctx.drawImage(imgs.brick, p.x, p.y, p.width, p.height);
                } else {
                    ctx.fillStyle = "#A0522D";
                    ctx.fillRect(p.x, p.y, p.width, p.height);
                    ctx.strokeRect(p.x, p.y, p.width, p.height);
                }
            } else if (p.type === "block_question") {
                if (imgs.question.complete) {
                    ctx.drawImage(imgs.question, p.x, p.y, p.width, p.height);
                } else {
                    ctx.fillStyle = "#FFD700";
                    ctx.fillRect(p.x, p.y, p.width, p.height);
                    ctx.fillText("?", p.x + 15, p.y + 35);
                }
            } else if (p.type === "block_empty") {
                // Empty block (hit question block)
                ctx.fillStyle = "#8B4513"; // Dark brown/metal
                ctx.fillRect(p.x, p.y, p.width, p.height);
                ctx.strokeStyle = "#000";
                ctx.strokeRect(p.x, p.y, p.width, p.height);
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

        // 4. Letters
        entities.letters.forEach(l => {
            if (!l.active || !isOnScreen(l, camera.x)) return;
            // Draw Bubble
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.beginPath();
            ctx.arc(l.x + l.width / 2, l.y + l.height / 2, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#F59E0B";
            ctx.lineWidth = 3;
            ctx.stroke();
            // Draw Text
            ctx.fillStyle = "#F59E0B";
            ctx.font = "bold 24px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(l.char || "?", l.x + l.width / 2, l.y + l.height / 2 + 2);
        });

        // 5. Enemies
        entities.enemies.forEach(e => {
            if (!e.active || !isOnScreen(e, camera.x)) return;
            ctx.drawImage(imgs.enemy, e.x, e.y, e.width, e.height);
        });


        // 6. Finish Line (Flag Pole Only)
        let flagW = 80;
        let flagH = 300; // Standalone height

        if (imgs.flag && imgs.flag.complete && imgs.flag.naturalHeight > 0) {
            const ratio = imgs.flag.naturalWidth / imgs.flag.naturalHeight;
            flagW = flagH * ratio;
        }

        const flagX = LEVEL_LENGTH - 150;

        if (imgs.flag && imgs.flag.complete) {
            // Draw Flag rooted at groundY
            // Support rotation
            const f = stateRef.current.flag;

            ctx.save();
            // Pivot at bottom left: (flagX, groundY)
            ctx.translate(flagX, groundY);
            ctx.rotate(f.angle);
            ctx.translate(-flagX, -groundY);

            ctx.drawImage(imgs.flag, flagX, groundY - flagH, flagW, flagH);
            ctx.restore();
        } else {
            // Fallback
            ctx.fillStyle = "#888";
            ctx.fillRect(flagX, groundY - 300, 20, 300);
        }

        // Removed old Gate logic

        // Lock Icon/Text (User image has lock baked in, so we skip manual overlay to avoid clutter)

        // 6. Player
        ctx.save();

        // Blinking Effect (Invulnerability)
        if (player.invincibleUntil > Date.now()) {
            // Blink every 100ms
            if (Math.floor(Date.now() / 100) % 2 === 0) {
                ctx.globalAlpha = 0.2;
            }
        }

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

    const togglePause = () => {
        if (gameState === "playing") setGameState("paused");
        else if (gameState === "paused") {
            setGameState("playing");
            setTimeout(() => containerRef.current?.focus(), 10);
        }
    };

    const requestHome = () => {
        if (gameState === "playing") setGameState("paused");
        setShowExitConfirm(true);
    };

    const confirmExit = () => {
        if (blocker.state === "blocked") {
            blocker.proceed();
        } else {
            navigate("/game");
        }
        setShowExitConfirm(false);
    };

    const cancelExit = () => {
        if (blocker.state === "blocked") {
            blocker.reset();
        }
        setShowExitConfirm(false);
    };

    const requestRestart = () => {
        if (gameState === "playing") setGameState("paused");
        setShowRestartConfirm(true);
    };

    const confirmRestart = () => {
        setShowRestartConfirm(false);
        handleStart();
    };

    const cancelRestart = () => {
        setShowRestartConfirm(false);
    };

    const handleStart = () => {
        setGameState("playing");
        setScore(0);
        setLives(3);
        resetLevel();
        // Force focus to game container
        setTimeout(() => containerRef.current?.focus(), 10);
    };

    return (
        <div className="relative w-full h-[calc(100vh-9rem)] flex flex-col items-center justify-between bg-sky-200 font-sans overflow-hidden touch-none">
            {/* UI Overlay - Top Controls (Only when playing/paused) */}


            {/* UI Overlay - Top Controls (Only when playing/paused) */}
            {(gameState === "playing" || gameState === "paused") && (
                <div className={cn("absolute top-4 left-4 flex gap-2", gameState === "paused" ? "z-20" : "z-[100]")}>
                    <Button size="icon" variant="secondary" className="rounded-full shadow-lg border-2 border-slate-200" onClick={(e) => { e.stopPropagation(); requestRestart(); }}>
                        <RefreshCw className="size-6 text-slate-700" />
                    </Button>
                    <Button size="icon" variant="secondary" className="rounded-full shadow-lg border-2 border-slate-200" onClick={(e) => { e.stopPropagation(); togglePause(); }}>
                        {gameState === "paused" ? <Play className="size-6 text-green-600" /> : <Pause className="size-6 text-slate-700" />}
                    </Button>
                </div>
            )}

            {/* UI Overlay - Score & Lives (Only when playing/paused) */}
            {(gameState === "playing" || gameState === "paused") && (
                <div className={cn("absolute top-4 right-4 flex gap-4 pointer-events-none", gameState === "paused" ? "z-20" : "z-[100]")}>
                    {/* Lives */}
                    <div className="bg-white/90 px-4 py-1 rounded-full font-bold text-red-500 border-2 border-red-400 flex items-center gap-2 shadow-lg">
                        <Heart className="size-6 fill-red-500" />
                        {lives}
                    </div>
                    {/* Score */}
                    <div className="bg-white/90 px-4 py-1 rounded-full font-bold text-amber-600 border-2 border-amber-400 flex items-center gap-2 shadow-lg">
                        <img src={COIN_Img} className="w-6 h-6" alt="Coin" />
                        {score}
                    </div>
                </div>
            )}

            {/* Collected Letters HUD */}
            {(gameState === "playing" || gameState === "paused") && (
                <div className="absolute top-16 right-4 flex gap-1 pointer-events-none z-[100]">
                    {collectedLetters.map((char, i) => (
                        <div key={i} className="w-8 h-8 bg-white border-2 border-amber-500 rounded-full flex items-center justify-center font-bold text-amber-600 shadow-sm animate-in zoom-in">
                            {char}
                        </div>
                    ))}
                </div>
            )}



            {/* Game Canvas Area - Shrinks to fit */}
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center bg-sky-200">
                <div
                    ref={containerRef}
                    tabIndex={0}
                    className="relative outline-none focus:ring-none group w-full h-full flex items-center justify-center border-none"
                    onClick={() => containerRef.current?.focus()}
                >
                    <canvas
                        ref={canvasRef}
                        width={canvasWidth}
                        height={canvasHeight}
                        className="max-w-full max-h-full object-contain bg-sky-200"
                    />



                    {/* Overlays - Start / Game Over / Paused / Confirmations */}
                    {/* Z-Index raised to 120 to cover HUD (100) */}
                    {(gameState !== "playing" || showRestartConfirm || showExitConfirm || showPuzzle) && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[120]">
                            <Card className="p-6 max-w-[360px] w-full text-center space-y-4 border-4 border-primary/20 bg-background/95 shadow-xl">
                                {/* 1. Restart Confirmation */}
                                {showRestartConfirm ? (
                                    <>
                                        <h1 className="text-3xl font-black text-amber-500 mb-4">CHƠI LẠI?</h1>
                                        <p className="text-muted-foreground">Điểm số hiện tại của bạn sẽ bị mất.</p>
                                        <div className="space-y-3">
                                            <Button size="lg" className="w-full text-xl h-14 bg-amber-500 hover:bg-amber-600 font-bold" onClick={confirmRestart}>
                                                <RefreshCw className="mr-2 size-5" /> Chơi Lại
                                            </Button>
                                            <Button size="lg" variant="outline" className="w-full text-xl h-14" onClick={cancelRestart}>
                                                Hủy
                                            </Button>
                                        </div>
                                    </>
                                ) :
                                    /* 3. Puzzle Modal */
                                    showPuzzle && targetWord ? (
                                        <div className="w-full">
                                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-500 animate-pulse" />

                                            <h2 className="text-2xl font-bold text-amber-600 mb-1">MỞ KHÓA CỔNG!</h2>
                                            <p className="text-sm text-slate-600 mb-2">Sắp xếp các chữ cái để tạo thành từ đúng:</p>

                                            <div className="text-lg font-bold bg-slate-100 p-2 rounded-lg border border-slate-200 mb-4 text-slate-800">
                                                "{targetWord.meaning}"
                                            </div>

                                            {/* Target Slots */}
                                            <div className="flex justify-center gap-2 flex-wrap mb-6">
                                                {puzzleInput.map((char, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            const newIn = [...puzzleInput];
                                                            newIn[i] = "";
                                                            setPuzzleInput(newIn);
                                                        }}
                                                        className={cn(
                                                            "w-10 h-12 border-b-4 text-xl font-bold flex items-center justify-center transition-all rounded-t-md",
                                                            char ? "border-amber-500 bg-amber-100 text-amber-600" : "border-slate-300 bg-slate-50"
                                                        )}
                                                    >
                                                        {char}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Available Letters (Collected) */}
                                            <div className="space-y-2 mb-6">
                                                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Kí tự của bạn</p>
                                                <div className="flex justify-center gap-2 flex-wrap min-h-[50px]">
                                                    {collectedLetters.map((char, i) => {
                                                        const usedCount = puzzleInput.filter(c => c === char).length;
                                                        const totalCount = collectedLetters.filter(c => c === char).length;
                                                        const available = totalCount > usedCount;

                                                        return (
                                                            <button
                                                                key={i}
                                                                disabled={!available}
                                                                onClick={() => {
                                                                    const emptyIdx = puzzleInput.findIndex(c => c === "");
                                                                    if (emptyIdx !== -1) {
                                                                        const newIn = [...puzzleInput];
                                                                        newIn[emptyIdx] = char;
                                                                        setPuzzleInput(newIn);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "w-10 h-10 rounded-full font-bold flex items-center justify-center shadow-md border-b-2 transition-all active:scale-95",
                                                                    available ? "bg-white text-slate-800 border-slate-200 hover:bg-slate-50" : "bg-slate-200 text-slate-400 border-transparent opacity-50 cursor-not-allowed"
                                                                )}
                                                            >
                                                                {char}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <Button
                                                size="default"
                                                className="w-full bg-green-600 hover:bg-green-700 font-bold text-base h-10 shadow-lg active:translate-y-0.5"
                                                onClick={handleUnlock}
                                            >
                                                MỞ KHÓA
                                            </Button>
                                        </div>
                                    ) :
                                        /* 2. Exit/Navigation Confirmation */
                                        showExitConfirm ? (
                                            <>
                                                <h1 className="text-3xl font-black text-red-500 mb-4">THOÁT GAME?</h1>
                                                <p className="text-muted-foreground">Tiến trình chơi sẽ không được lưu.</p>
                                                <div className="space-y-3">
                                                    <Button size="lg" className="w-full text-xl h-14 bg-red-500 hover:bg-red-600 font-bold text-white" onClick={confirmExit}>
                                                        <Home className="mr-2 size-5" /> Thoát
                                                    </Button>
                                                    <Button size="lg" variant="outline" className="w-full text-xl h-14" onClick={cancelExit}>
                                                        Ở Lại
                                                    </Button>
                                                </div>
                                            </>
                                        ) :
                                            /* 3. Game Over */
                                            gameState === "gameover" ? (
                                                <>
                                                    <h1 className="text-4xl font-black text-primary mb-4 bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-600">
                                                        GAME OVER
                                                    </h1>
                                                    <p className="text-muted-foreground">Điểm số: {score}</p>
                                                    <Button size="lg" className="w-full text-xl h-14" onClick={handleStart}>
                                                        <RefreshCw className="mr-2 size-5" /> Thử lại
                                                    </Button>
                                                </>
                                            ) :
                                                /* 4. Victory */
                                                gameState === "win" ? (
                                                    <>
                                                        <h1 className="text-4xl font-black text-primary mb-4 bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-amber-600">
                                                            VICTORY!
                                                        </h1>
                                                        <Trophy className="size-20 text-yellow-500 mx-auto animate-bounce" />
                                                        <p className="text-muted-foreground">Bạn đã về đích!</p>
                                                        <p className="text-2xl font-bold">Điểm số: {score}</p>
                                                        <Button size="lg" className="w-full text-xl h-14" onClick={handleStart}>
                                                            <RefreshCw className="mr-2 size-5" /> Chơi lại
                                                        </Button>
                                                    </>
                                                ) :
                                                    /* 5. Paused */
                                                    gameState === "paused" ? (
                                                        <>
                                                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">
                                                                TẠM DỪNG
                                                            </h2>
                                                            <Button size="lg" className="w-full text-xl h-14" onClick={togglePause}>
                                                                <Play className="mr-2 size-5" /> Tiếp tục
                                                            </Button>
                                                            <Button size="lg" variant="outline" className="w-full text-xl h-14" onClick={requestHome}>
                                                                <Home className="mr-2 size-5" /> Về trang chủ
                                                            </Button>
                                                        </>
                                                    ) :
                                                        /* 6. Start Screen */
                                                        (
                                                            <>
                                                                <h1 className="text-4xl font-black text-primary mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-600">
                                                                    Word Runner
                                                                </h1>
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
            </div >

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
        </div >
    );
};

export default WordRunner;
