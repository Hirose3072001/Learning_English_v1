import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal, BackHandler, Image, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft, Heart, RotateCcw, Zap, Pause, Play, Home } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- Physics Constants (matched to web) ---
const GRAVITY = 0.5;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const ENEMY_SPEED = 1.5;
const CONTROL_BAR_HEIGHT = 140;
const GROUND_Y_OFFSET = 50;
const GAME_HEIGHT = 450;
const GROUND_Y = GAME_HEIGHT - GROUND_Y_OFFSET;

// Player size (proportional to web's 68x98 on 800x600 canvas)
const PLAYER_W = 50;
const PLAYER_H = 72;

let LEVEL_LENGTH = 5000;

// --- Assets ---
const HERO_IDLE = require('../assets/images/mario_idle.png');
const HERO_RUN = require('../assets/images/mario_run.png');
const HERO_JUMP = require('../assets/images/mario_jump.png');
const ENEMY_IMG = require('../assets/images/monster_up.png');
const COIN_IMG = require('../assets/images/coin.png');
const GROUND_IMG = require('../assets/images/ground_texture_v2.png');
const PLATFORM_IMG = require('../assets/images/platform.png');
const BRICK_IMG = require('../assets/images/brick.png');
const QUESTION_IMG = require('../assets/images/question.png');
const FLAG_IMG = require('../assets/images/flag_pole_final.png');

interface Entity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'platform' | 'brick' | 'pipe' | 'block_brick' | 'block_question' | 'block_empty' | 'enemy' | 'letter' | 'coin' | 'flag';
  active: boolean;
  vx?: number;
  vy?: number;
  char?: string;
  patrolMin?: number;
  patrolMax?: number;
}

interface Vocabulary {
  id: string;
  word: string;
  meaning: string;
}

export default function WordRunnerScreen({ navigation }: any) {
  const { user } = useAuth();

  const [gameStatus, setGameStatus] = useState<'start' | 'playing' | 'paused' | 'gameover' | 'win'>('start');
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [targetWord, setTargetWord] = useState<Vocabulary | null>(null);
  const [collectedLetters, setCollectedLetters] = useState<string[]>([]);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [puzzleInput, setPuzzleInput] = useState<string[]>([]);

  const requestRef = useRef<number>();
  const gameStatusRef = useRef(gameStatus);
  const scoreRef = useRef(0);
  const showPuzzleRef = useRef(showPuzzle);
  // Use refs for values read inside game loop (avoids stale closure in useCallback)
  const isMapLoadingRef = useRef(false);
  const platformsRef = useRef<Entity[]>([]); // Cached solid platforms, rebuilt on level gen only
  
  const debugRef = useRef({ loopCount: 0, lastError: '' });

  // Track player visual state separately (updated each frame) for reliable sprite selection
  const playerVisualRef = useRef({ isMoving: false, isGrounded: true, facingRight: true });

  const stateRef = useRef({
    cameraX: 0,
    player: {
      x: 100, y: 100, width: PLAYER_W, height: PLAYER_H,
      vx: 0, vy: 0, grounded: false, dead: false, facingRight: true,
      lives: 3, invincibleUntil: 0,
    },
    keys: { left: false, right: false, jump: false },
    jumpLocked: false,
    entities: [] as Entity[],
    collectedLetters: [] as string[],
    flag: { state: 'idle' as 'idle' | 'falling' | 'fallen', angle: 0, vy: 0 },
  });

  const [renderTick, setRenderTick] = useState(0);

  const { data: vocabulary, isLoading } = useQuery({
    queryKey: ['vocabulary-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vocabulary').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // --- Back Handler ---
  const handleBackPress = useCallback(() => {
    if (gameStatusRef.current === 'playing') {
      gameStatusRef.current = 'paused';
      setGameStatus('paused');
      setShowExitModal(true);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const bh = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => bh.remove();
  }, [handleBackPress]);

  const handleExitGame = () => {
    setShowExitModal(false);
    gameStatusRef.current = 'gameover';
    setGameStatus('gameover');
  };

  // --- Level Generation (faithful to web) ---
  const generateLevel = useCallback((vocab: Vocabulary[]) => {
    let word = 'HELLO';
    let vocabItem: Vocabulary = { id: 'default', word: 'HELLO', meaning: 'Xin chào' };
    if (vocab && vocab.length > 0) {
      vocabItem = vocab[Math.floor(Math.random() * vocab.length)];
      word = vocabItem.word.toUpperCase();
    }
    setTargetWord(vocabItem);
    setPuzzleInput(new Array(word.length).fill(''));

    const targetChars = word.split('');
    const distractors = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').sort(() => 0.5 - Math.random()).slice(0, 5);
    const spawnPool = [...targetChars, ...distractors].sort(() => 0.5 - Math.random());
    let spawnIndex = 0;

    LEVEL_LENGTH = Math.max(5000, 1000 + spawnPool.length * 550);

    const entities: Entity[] = [];

    // PRE-SPAWN inactive coin pool so their Images stay mounted (prevents decode pop-in on drop)
    for (let poolIdx = 0; poolIdx < 20; poolIdx++) {
      entities.push({ id: `_pool_coin_${poolIdx}`, x: -9999, y: -9999, width: 30, height: 30, type: 'coin', active: false });
    }

    // Ground
    entities.push({ id: 'ground', x: 0, y: GROUND_Y, width: LEVEL_LENGTH, height: 500, type: 'ground', active: true });
    // End wall
    entities.push({ id: 'endwall', x: LEVEL_LENGTH, y: 0, width: 50, height: GROUND_Y + 100, type: 'platform', active: true });
    // Flag
    entities.push({ id: 'flag', x: LEVEL_LENGTH - 150, y: GROUND_Y - 200, width: 60, height: 200, type: 'flag', active: true });

    let x = 500;
    while (x < LEVEL_LENGTH - 500) {
      const gap = 200 + Math.random() * 150;
      const rng = Math.random();

      if (rng < 0.3) {
        // Floating brick platform with letter/coin on top
        const platW = 80 + Math.random() * 80;
        entities.push({ id: `br_${x}`, x, y: GROUND_Y - 140, width: platW, height: 40, type: 'brick', active: true });

        if (spawnIndex < spawnPool.length) {
          entities.push({
            id: `let_${x}`, x: x + platW / 2 - 15, y: GROUND_Y - 190, width: 36, height: 36,
            type: 'letter', active: true, char: spawnPool[spawnIndex++]
          });
        } else {
          entities.push({ id: `coin_${x}`, x: x + platW / 2 - 15, y: GROUND_Y - 190, width: 36, height: 36, type: 'coin', active: true });
        }
        x += platW + gap;
      } else if (rng < 0.5) {
        // Question/Brick block cluster
        const startX = x;
        const pattern = Math.random() > 0.5
          ? ['block_question', 'block_brick', 'block_question']
          : ['block_brick', 'block_question', 'block_brick', 'block_brick'];

        pattern.forEach((bType, i) => {
          entities.push({
            id: `blk_${x}_${i}`, x: startX + i * 42, y: GROUND_Y - 160,
            width: 40, height: 40, type: bType as any, active: true
          });
        });

        // Enemy underneath
        entities.push({
          id: `en_${x}`, x: startX + 40, y: GROUND_Y - 50, width: 44, height: 44,
          type: 'enemy', active: true, vx: -ENEMY_SPEED,
          patrolMin: startX - 50, patrolMax: startX + 350
        });

        if (spawnIndex < spawnPool.length) {
          entities.push({
            id: `let2_${x}`, x: startX + 40, y: GROUND_Y - 220, width: 36, height: 36,
            type: 'letter', active: true, char: spawnPool[spawnIndex++]
          });
        }
        x += pattern.length * 42 + gap;
      } else if (rng < 0.7) {
        // Pipe with enemy nearby
        const pipeW = 70;
        entities.push({ id: `pipe_${x}`, x, y: GROUND_Y - 90, width: pipeW, height: 90, type: 'pipe', active: true });
        const ex = x + 120;
        entities.push({
          id: `en2_${x}`, x: ex, y: GROUND_Y - 50, width: 44, height: 44,
          type: 'enemy', active: true, vx: -ENEMY_SPEED,
          patrolMin: ex - 150, patrolMax: ex + 150
        });

        if (spawnIndex < spawnPool.length) {
          entities.push({
            id: `let3_${x}`, x: x + pipeW / 2 - 15, y: GROUND_Y - 180, width: 36, height: 36,
            type: 'letter', active: true, char: spawnPool[spawnIndex++]
          });
        }
        x += pipeW + gap;
      } else {
        // Ground enemy area
        entities.push({
          id: `en3_${x}`, x, y: GROUND_Y - 50, width: 44, height: 44,
          type: 'enemy', active: true, vx: -ENEMY_SPEED,
          patrolMin: x - 50, patrolMax: x + 450
        });

        if (spawnIndex < spawnPool.length) {
          entities.push({
            id: `let4_${x}`, x: x + 60, y: GROUND_Y - 140, width: 36, height: 36,
            type: 'letter', active: true, char: spawnPool[spawnIndex++]
          });
        }
        x += 150 + gap;
      }
    }
    return entities;
  }, []);

  // --- Start Game ---
  const startGame = () => {
    setIsMapLoading(true);
    const s = stateRef.current;
    const vocab = vocabulary || [];
    s.entities = generateLevel(vocab as any);
    s.player = {
      x: 100, y: GROUND_Y - 200, width: PLAYER_W, height: PLAYER_H,
      vx: 0, vy: 0, grounded: false, dead: false, facingRight: true,
      lives: 3, invincibleUntil: 0
    };
    s.cameraX = 0;
    s.keys = { left: false, right: false, jump: false };
    s.jumpLocked = false;
    s.collectedLetters = [];
    s.flag = { state: 'idle', angle: 0, vy: 0 };
    debugRef.current = { loopCount: 0, lastError: '' };

    setScore(0);
    scoreRef.current = 0;
    setLives(3);
    setCollectedLetters([]);
    setShowPuzzle(false);
    showPuzzleRef.current = false;
    gameStatusRef.current = 'playing';
    setGameStatus('playing');

    // Cache solid platforms once (avoids .filter() every frame in game loop)
    const solidTypes = ['ground', 'platform', 'brick', 'pipe', 'block_brick', 'block_question', 'block_empty'];
    platformsRef.current = s.entities.filter(e => solidTypes.includes(e.type));

    // Map loading: use ref so game loop reads current value (avoids stale closure)
    isMapLoadingRef.current = true;
    setIsMapLoading(true);
    setTimeout(async () => {
      try {
        const assets = [HERO_IDLE, HERO_RUN, HERO_JUMP, ENEMY_IMG, COIN_IMG, GROUND_IMG, PLATFORM_IMG, BRICK_IMG, QUESTION_IMG, FLAG_IMG];
        await Promise.all(assets.map(a => Image.prefetch(Image.resolveAssetSource(a).uri)));
      } catch(e) {}
      isMapLoadingRef.current = false;
      setIsMapLoading(false);
      
      // EXPLICITLY START GAME LOOP HERE
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(updateGame);
    }, 1500);
  };

  // --- Collision Helpers ---
  const rectIntersect = (r1: any, r2: any) =>
    !(r2.x >= r1.x + r1.width || r2.x + r2.width <= r1.x || r2.y >= r1.y + r1.height || r2.y + r2.height <= r1.y);

  const checkCollision = (r1: any, r2: any, pad: number) =>
    !(r2.x + pad >= r1.x + r1.width - pad || r2.x + r2.width - pad <= r1.x + pad ||
      r2.y + pad >= r1.y + r1.height - pad || r2.y + r2.height - pad <= r1.y + pad);

  const checkPlatformCollisions = (ent: any, platforms: Entity[], axis: 'x' | 'y') => {
    for (const plat of platforms) {
      if (!rectIntersect(ent, plat)) continue;
      if (axis === 'x') {
        if (ent.vx > 0) ent.x = plat.x - ent.width;
        else if (ent.vx < 0) ent.x = plat.x + plat.width;
        ent.vx = 0;
      } else {
        if (ent.vy > 0) {
          ent.y = plat.y - ent.height;
          ent.grounded = true;
          ent.vy = 0;
        } else if (ent.vy < 0) {
          ent.y = plat.y + plat.height;
          ent.vy = 0;
          // Block interactions
          if (plat.type === 'block_brick') {
            plat.active = false;
            scoreRef.current += 10;
            setScore(scoreRef.current);
          } else if (plat.type === 'block_question') {
            plat.type = 'block_empty';
            scoreRef.current += 50;
            setScore(scoreRef.current);
            // Reuse pooled coin (already mounted, no decode delay)
            const pooledCoin = stateRef.current.entities.find(ent => ent.type === 'coin' && !ent.active);
            if (pooledCoin) { pooledCoin.x = plat.x + 5; pooledCoin.y = plat.y - 40; pooledCoin.active = true; }
          }
        }
      }
    }
  };

  // --- Damage & Death ---
  const takeDamage = () => {
    const { player } = stateRef.current;
    if (Date.now() < player.invincibleUntil) return;
    player.lives -= 1;
    setLives(player.lives);
    player.invincibleUntil = Date.now() + 2000;
    if (player.lives <= 0) {
      die();
    } else {
      player.x = 100;
      player.y = GROUND_Y - 200;
      player.vx = 0;
      player.vy = 0;
      stateRef.current.cameraX = 0;
      stateRef.current.flag = { state: 'idle', angle: 0, vy: 0 };
    }
  };

  const die = () => {
    stateRef.current.player.dead = true;
    gameStatusRef.current = 'gameover';
    setGameStatus('gameover');
    saveHighScore();
  };

  const saveHighScore = async () => {
    if (!user?.id || scoreRef.current <= 0) return;
    try {
      const { data } = await supabase.from('profiles').select('xp').eq('user_id', user.id).single();
      const currentXP = data?.xp || 0;
      const earnedXP = Math.floor(scoreRef.current / 10);
      if (earnedXP > 0) {
        await supabase.from('profiles').update({ xp: currentXP + earnedXP }).eq('user_id', user.id);
        await supabase.from('xp_logs').insert({ user_id: user.id, amount: earnedXP, source: 'word_runner' });
      }
    } catch (e) { console.error(e); }
  };

  // --- Game Loop ---
  const updateGame = useCallback(() => {
    try {
      if (gameStatusRef.current !== 'playing' || isMapLoadingRef.current) return;
      debugRef.current.loopCount += 1;
      const s = stateRef.current;
      const { player, keys, entities } = s;
      if (player.dead) return;

    // 1. Controls
    if (keys.right) { player.vx = MOVE_SPEED; player.facingRight = true; }
    else if (keys.left) { player.vx = -MOVE_SPEED; player.facingRight = false; }
    else { player.vx *= 0.8; if (Math.abs(player.vx) < 0.5) player.vx = 0; }

    if (keys.jump) {
      if (!s.jumpLocked && player.grounded) {
        player.vy = JUMP_FORCE;
        player.grounded = false;
        s.jumpLocked = true;
      }
    } else {
      s.jumpLocked = false;
    }

    // 2. Physics
    player.vy += GRAVITY;
    player.x += player.vx;
    if (player.x < 0) player.x = 0;

    // Use cached platforms ref (rebuilt once on level gen, not every frame)
    // IMPORTANT: re-filter only block types that can change state (question->empty)
    const solidTypes = ['ground', 'platform', 'brick', 'pipe', 'block_brick', 'block_question', 'block_empty'];
    const platforms = platformsRef.current.filter(e => e.active && solidTypes.includes(e.type));

    checkPlatformCollisions(player, platforms, 'x');
    player.y += player.vy;
    player.grounded = false;
    checkPlatformCollisions(player, platforms, 'y');

    // Fall death
    if (player.y > GAME_HEIGHT + 100) { die(); return; }

    // 3. Camera
    let targetCam = player.x - SCREEN_WIDTH * 0.3;
    if (targetCam < 0) targetCam = 0;
    if (targetCam > LEVEL_LENGTH - SCREEN_WIDTH) targetCam = LEVEL_LENGTH - SCREEN_WIDTH;
    s.cameraX += (targetCam - s.cameraX) * 0.1;

    // 4. Enemies
    for (const e of entities) {
      if (!e.active || e.type !== 'enemy') continue;
      e.vy = (e.vy || 0) + GRAVITY;
      e.x += (e.vx || 0);
      e.y += e.vy;

      // Patrol bounds
      if (e.patrolMin !== undefined && e.x <= e.patrolMin) { e.x = e.patrolMin; e.vx = Math.abs(e.vx || 0); }
      if (e.patrolMax !== undefined && e.x + e.width >= e.patrolMax) { e.x = e.patrolMax - e.width; e.vx = -Math.abs(e.vx || 0); }

      // Enemy platform collision
      for (const p of platforms) {
        if (rectIntersect(e, p)) {
          if (rectIntersect({ ...e, y: e.y - (e.vy || 0) }, p)) {
            e.vx = -(e.vx || 0);
            e.x += (e.vx || 0) * 2;
          } else if ((e.vy || 0) > 0) {
            e.y = p.y - e.height;
            e.vy = 0;
          }
        }
      }

      // Player vs Enemy (with stricter hitbox)
      if (checkCollision(player, e, 8)) {
        const enemyCenterY = e.y + e.height / 2;
        const playerBottom = player.y + player.height;
        const hitFromTop = player.vy > 0 && playerBottom < enemyCenterY + 10;
        if (hitFromTop) {
          e.active = false;
          player.vy = -10;
          scoreRef.current += 100;
          setScore(scoreRef.current);
          // Reuse pooled coin (already mounted, no decode delay)
          const pooledCoin = entities.find(ent => ent.type === 'coin' && !ent.active);
          if (pooledCoin) { pooledCoin.x = e.x; pooledCoin.y = e.y; pooledCoin.active = true; }
        } else {
          takeDamage();
        }
      }
    }

    // 5. Coins
    for (const c of entities) {
      if (!c.active || c.type !== 'coin') continue;
      if (checkCollision(player, c, 10)) {
        c.active = false;
        scoreRef.current += 50;
        setScore(scoreRef.current);
      }
    }

    // 6. Letters
    for (const l of entities) {
      if (!l.active || l.type !== 'letter') continue;
      if (checkCollision(player, l, 8)) {
        l.active = false;
        if (l.char) {
          s.collectedLetters.push(l.char);
          setCollectedLetters([...s.collectedLetters]);
          scoreRef.current += 20;
          setScore(scoreRef.current);
        }
      }
    }

    // 7. Win Condition (reach flag)
    if (player.x >= LEVEL_LENGTH - 200 && !showPuzzleRef.current && s.flag.state === 'idle') {
      gameStatusRef.current = 'paused';
      setGameStatus('paused');
      setShowPuzzle(true);
      showPuzzleRef.current = true;
    }

    // *** UPDATE VISUAL STATE AFTER ALL PHYSICS (mirrors web's draw-after-update pattern) ***
    // We use keys for isMoving instead of vx so the animation stops IMMEDIATELY when the user
    // releases the button, rather than waiting 10 frames (160ms) for friction to slide the character to a halt.
    playerVisualRef.current = {
      isMoving: keys.left || keys.right,
      isGrounded: player.grounded,
      facingRight: player.facingRight,
    };

    setRenderTick(prev => prev + 1);
    if (gameStatusRef.current === 'playing') {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    } catch (e: any) {
      debugRef.current.lastError = e.message || String(e);
      setRenderTick(prev => prev + 1);
    }
  }, []);

  // Removed problematic useEffect entirely - game loop is now started explicitly
  // to avoid React lifecycle race conditions.
  useEffect(() => {
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  // --- Puzzle Logic ---
  const handleLetterSelect = (char: string) => {
    const emptyIdx = puzzleInput.findIndex(c => c === '');
    if (emptyIdx !== -1) {
      const newIn = [...puzzleInput];
      newIn[emptyIdx] = char;
      setPuzzleInput(newIn);

      // Auto-submit if all slots are filled
      if (!newIn.includes('')) {
        handleUnlock(newIn.join(''));
      }
    }
  };

  const handleSlotClear = (idx: number) => {
    const newIn = [...puzzleInput];
    newIn[idx] = '';
    setPuzzleInput(newIn);
  };

  const handleUnlock = (guessOverride?: string) => {
    const guess = typeof guessOverride === 'string' ? guessOverride : puzzleInput.join('');
    if (!targetWord) return;
    if (guess.toUpperCase() === targetWord.word.toUpperCase()) {
      scoreRef.current += 1000;
      setScore(scoreRef.current);
      setShowPuzzle(false);
      gameStatusRef.current = 'win';
      setGameStatus('win');
      saveHighScore();
    } else {
      // Wrong! 
      Alert.alert('Sai rồi!', 'Hãy sắp xếp lại cho đúng nhé.', [
        { text: 'Thử lại' }
      ]);
    }
  };

  const s = stateRef.current;

  // Handle multitouch using native touches array directly (prevents stuck keys)
  const handleTouches = (evt: any) => {
    let l = false, r = false, j = false;
    const touches = evt.nativeEvent.touches || [];
    for (let i = 0; i < touches.length; i++) {
      const px = touches[i].pageX;
      const halfW = SCREEN_WIDTH / 2;
      if (px < halfW) {
        if (px < halfW / 2) l = true;
        else r = true;
      } else {
        j = true;
      }
    }

    if (s.keys.left !== l || s.keys.right !== r || s.keys.jump !== j) {
      s.keys.left = l;
      s.keys.right = r;
      s.keys.jump = j;
      // Force immediate visual update for character animation
      setRenderTick(prev => prev + 1); 
    }
  };

  const isBlinking = s.player.invincibleUntil > Date.now() && Math.floor(Date.now() / 100) % 2 === 0;

  // Sprite: read from playerVisualRef which is updated AFTER physics each frame
  // This mirrors web: draw() reads grounded/vx after update() has fully run
  const pv = playerVisualRef.current;
  let playerSprite = HERO_IDLE;
  if (!pv.isGrounded) playerSprite = HERO_JUMP;
  else if (pv.isMoving) playerSprite = HERO_RUN;

  // Viewport culling: only render entities within view + buffer
  // Coins (pool) stay mounted regardless (opacity trick) so Image stays in memory
  // This is the critical perf optimization: ~15 components instead of 100+ per frame
  const camX = s.cameraX;
  const renderBuffer = SCREEN_WIDTH * 1.5; // Render 1.5 screens ahead/behind
  const visibleEntities = s.entities.filter(e => {
    if (e.type === 'coin') return true; // Always keep coins mounted (object pool)
    if (!e.active) return false;
    if (e.type === 'ground') return true; // Ground is always needed
    return e.x + e.width > camX - renderBuffer && e.x < camX + SCREEN_WIDTH + renderBuffer;
  });

  return (
    <View style={styles.container}>
      {/* Preload images into memory to prevent decode lag on first render */}
      <View style={{ position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden' }}>
        {[ENEMY_IMG, COIN_IMG, GROUND_IMG, PLATFORM_IMG, BRICK_IMG, QUESTION_IMG, FLAG_IMG].map((src, i) => (
          <Image key={i} source={src} style={{ width: 1, height: 1 }} />
        ))}
      </View>

      {/* Sky gradient background */}
      <LinearGradient colors={['#60A5FA', '#93C5FD']} style={styles.sky} />

      {/* Game World */}
      <View style={styles.gameArea}>
        <View style={[styles.worldContainer, { transform: [{ translateX: -s.cameraX }] }]}>

          {/* Render all visible entities */}
          {visibleEntities.map(e => {
            if (e.type === 'ground') {
              return (
                <View key={e.id} style={{ position: 'absolute', left: Math.max(0, s.cameraX - 10), top: e.y, width: SCREEN_WIDTH + 20, height: 300 }}>
                  {/* Grass strip */}
                  <View style={{ width: '100%', height: 18, backgroundColor: '#22c55e' }} />
                  {/* Dirt */}
                  <View style={{ flex: 1, backgroundColor: '#5D4037' }} />
                </View>
              );
            }

            if (e.type === 'brick') {
              return (
                <View key={e.id} style={{ position: 'absolute', left: e.x, top: e.y, width: e.width, height: e.height }}>
                  <Image source={PLATFORM_IMG} style={{ width: '100%', height: '100%' }} resizeMode="stretch" />
                </View>
              );
            }

            if (e.type === 'pipe') {
              return (
                <View key={e.id} style={{ position: 'absolute', left: e.x, top: e.y, width: e.width, height: e.height }}>
                  {/* Pipe rim */}
                  <View style={{ width: e.width + 10, marginLeft: -5, height: 16, backgroundColor: '#16a34a', borderRadius: 4 }} />
                  <View style={{ flex: 1, backgroundColor: '#22c55e' }} />
                </View>
              );
            }

            if (e.type === 'block_brick') {
              return (
                <View key={e.id} style={{ position: 'absolute', left: e.x, top: e.y, width: e.width, height: e.height }}>
                  <Image source={BRICK_IMG} style={{ width: '100%', height: '100%' }} resizeMode="stretch" />
                </View>
              );
            }

            if (e.type === 'block_question') {
              return (
                <View key={e.id} style={{ position: 'absolute', left: e.x, top: e.y, width: e.width, height: e.height }}>
                  <Image source={QUESTION_IMG} style={{ width: '100%', height: '100%' }} resizeMode="stretch" />
                </View>
              );
            }

            if (e.type === 'block_empty') {
              return (
                <View key={e.id} style={{ position: 'absolute', left: e.x, top: e.y, width: e.width, height: e.height, backgroundColor: '#8B4513', borderWidth: 1, borderColor: '#000' }} />
              );
            }

            if (e.type === 'enemy') {
              return (
                <View key={e.id} style={{ position: 'absolute', left: e.x, top: e.y, width: e.width, height: e.height }}>
                  <Image source={ENEMY_IMG} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                </View>
              );
            }

            if (e.type === 'coin') {
              // Always render coins (active or pooled-inactive) to keep Image mounted
              return (
                <View key={e.id} style={{ position: 'absolute', left: e.x, top: e.y, width: e.width, height: e.height, opacity: e.active ? 1 : 0 }}>
                  <Image source={COIN_IMG} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                </View>
              );
            }

            if (e.type === 'letter') {
              return (
                <View key={e.id} style={styles.letterBubble}>
                  <View style={[styles.letterCircle, { left: e.x, top: e.y, width: e.width, height: e.height }]}>
                    <Text style={styles.letterText}>{e.char}</Text>
                  </View>
                </View>
              );
            }

            if (e.type === 'flag') {
              return (
                <View key={e.id} style={{ position: 'absolute', left: e.x, top: e.y, width: e.width, height: e.height }}>
                  <Image source={FLAG_IMG} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                </View>
              );
            }

            return null;
          })}

          {/* Player */}
          {gameStatus !== 'start' && (
            <View style={{
              position: 'absolute',
              left: s.player.x, top: s.player.y, width: s.player.width, height: s.player.height,
              transform: [{ scaleX: s.player.facingRight ? 1 : -1 }],
              opacity: isBlinking ? 0.2 : 1,
            }}>
              {/* Render all states simultaneously and toggle opacity to bypass Expo tunnel decode latency */}
              <Image source={HERO_IDLE} style={{ position: 'absolute', width: '100%', height: '100%', opacity: playerSprite === HERO_IDLE ? 1 : 0 }} resizeMode="contain" />
              <Image source={HERO_RUN} style={{ position: 'absolute', width: '100%', height: '100%', opacity: playerSprite === HERO_RUN ? 1 : 0 }} resizeMode="contain" />
              <Image source={HERO_JUMP} style={{ position: 'absolute', width: '100%', height: '100%', opacity: playerSprite === HERO_JUMP ? 1 : 0 }} resizeMode="contain" />
            </View>
          )}
        </View>

        {/* HUD Overlay */}
        <View style={styles.hud}>
          <View style={styles.hudLeft}>
            <TouchableOpacity style={styles.hudBtn} onPress={() => {
              if (gameStatus === 'playing') handleBackPress();
              else navigation.goBack();
            }}>
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>
            {(gameStatus === 'playing' || gameStatus === 'paused') && (
              <TouchableOpacity style={styles.hudBtn} onPress={() => {
                if (gameStatus === 'playing') {
                  gameStatusRef.current = 'paused';
                  setGameStatus('paused');
                } else {
                  gameStatusRef.current = 'playing';
                  setGameStatus('playing');
                  // EXPLICITLY RESTART GAME LOOP WHEN UNPAUSING
                  if (requestRef.current) cancelAnimationFrame(requestRef.current);
                  requestRef.current = requestAnimationFrame(updateGame);
                }
              }}>
                {gameStatus === 'paused' ? <Play size={20} color="#22c55e" /> : <Pause size={20} color="#fff" />}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.hudRight}>
            <View style={[styles.hudPill, { borderColor: '#94a3b8', paddingHorizontal: 6, maxWidth: 200 }]}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8' }} numberOfLines={2}>
                V4: L={debugRef.current.loopCount} Y={Math.round(stateRef.current.player.y)} M={playerVisualRef.current.isMoving?1:0} G={playerVisualRef.current.isGrounded?1:0}
                {debugRef.current.lastError ? ` ERR: ${debugRef.current.lastError}` : ''}
              </Text>
            </View>
            {/* Lives */}
            <View style={[styles.hudPill, { borderColor: '#f87171' }]}>
              <Heart size={18} color="#ef4444" fill="#ef4444" />
              <Text style={[styles.hudPillText, { color: '#ef4444' }]}>{lives}</Text>
            </View>
            {/* Score */}
            <View style={[styles.hudPill, { borderColor: '#fbbf24' }]}>
              <Image source={COIN_IMG} style={{ width: 20, height: 20 }} resizeMode="contain" />
              <Text style={[styles.hudPillText, { color: '#d97706' }]}>{score}</Text>
            </View>
          </View>
        </View>

        {/* Collected Letters HUD */}
        {(gameStatus === 'playing' || gameStatus === 'paused') && collectedLetters.length > 0 && (
          <View style={styles.collectedBar}>
            {collectedLetters.map((char, i) => (
              <View key={i} style={styles.collectedLetter}>
                <Text style={styles.collectedLetterText}>{char}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Control Bar (multitouch via direct native touches array) */}
      {gameStatus === 'playing' && (
        <View
          style={styles.controlBar}
          onTouchStart={handleTouches}
          onTouchMove={handleTouches}
          onTouchEnd={handleTouches}
          onTouchCancel={handleTouches}
        >
          {/* D-Pad visual */}
          <View style={styles.dpad} pointerEvents="none">
            <View style={styles.dpadBtn}>
              <ArrowLeft size={36} color="#cbd5e1" />
            </View>
            <View style={styles.dpadBtn}>
              <ArrowLeft size={36} color="#cbd5e1" style={{ transform: [{ rotate: '180deg' }] }} />
            </View>
          </View>
          {/* Jump Button visual */}
          <View style={styles.jumpBtn} pointerEvents="none">
            <ArrowLeft size={36} color="#fff" style={{ transform: [{ rotate: '90deg' }] }} />
          </View>
        </View>
      )}

      {/* Map Loading Overlay */}
      {gameStatus === 'playing' && isMapLoading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#58CC02" />
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 16 }}>Đang tải map...</Text>
        </View>
      )}

      {/* --- Overlays --- */}

      {/* Start Screen */}
      {gameStatus === 'start' && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: '#22c55e' }]}>Word Runner</Text>
            <View style={styles.instructionBox}>
              <Text style={styles.instructionText}>⬅️ ➡️  Di chuyển</Text>
              <Text style={styles.instructionText}>⬆️      Nhảy</Text>
            </View>
            <Text style={{ color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
              Thu thập chữ cái, nhảy lên đầu quái vật và ghép từ để chiến thắng!
            </Text>
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => navigation.goBack()}>
                <Home size={18} color="#4b5563" />
                <Text style={styles.btnOutlineText}>Thoát</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btn, styles.btnPrimary, isLoading && { backgroundColor: '#9ca3af' }]} 
                onPress={startGame}
                disabled={isLoading}
              >
                {!isLoading && <Play size={18} color="#fff" />}
                <Text style={styles.btnPrimaryText}>{isLoading ? 'ĐANG TẢI DỮ LIỆU...' : 'BẮT ĐẦU'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Game Over */}
      {gameStatus === 'gameover' && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: '#ef4444' }]}>GAME OVER</Text>
            <Text style={{ color: '#666', fontSize: 16, marginBottom: 8 }}>Điểm số: {score}</Text>
            <Text style={{ color: '#eab308', fontWeight: 'bold', fontSize: 16, marginBottom: 24 }}>+{Math.floor(score / 10)} XP</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => navigation.goBack()}>
                <Home size={18} color="#4b5563" />
                <Text style={styles.btnOutlineText}>Thoát</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={startGame}>
                <RotateCcw size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Victory */}
      {gameStatus === 'win' && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: '#eab308' }]}>VICTORY!</Text>
            <Text style={{ fontSize: 48, marginBottom: 8 }}>🏆</Text>
            <Text style={{ color: '#666', fontSize: 16, marginBottom: 8 }}>Bạn đã về đích!</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 22, color: '#333', marginBottom: 24 }}>Điểm: {score}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => navigation.goBack()}>
                <Home size={18} color="#4b5563" />
                <Text style={styles.btnOutlineText}>Thoát</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={startGame}>
                <RotateCcw size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Chơi lại</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Puzzle Modal */}
      <Modal visible={showPuzzle} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.card, { width: '90%' }]}>
            <View style={{ width: '100%', height: 3, backgroundColor: '#eab308', marginBottom: 16 }} />
            <Text style={[styles.cardTitle, { color: '#d97706', fontSize: 22 }]}>MỞ KHÓA CỔNG!</Text>
            <Text style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>Sắp xếp chữ cái để tạo từ đúng:</Text>
            <View style={styles.meaningBox}>
              <Text style={styles.meaningText}>"{targetWord?.meaning}"</Text>
            </View>

            {/* Puzzle Slots */}
            <View style={styles.puzzleSlots}>
              {puzzleInput.map((char, i) => (
                <TouchableOpacity key={i} style={[styles.puzzleSlot, char ? styles.puzzleSlotFilled : {}]} onPress={() => handleSlotClear(i)}>
                  <Text style={[styles.puzzleSlotText, char ? { color: '#d97706' } : {}]}>{char}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Available Letters */}
            <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Kí tự của bạn</Text>
            <View style={styles.availableLetters}>
              {collectedLetters.map((char, i) => {
                const usedCount = puzzleInput.filter(c => c === char).length;
                const totalCount = collectedLetters.filter(c => c === char).length;
                const available = totalCount > usedCount;
                return (
                  <TouchableOpacity key={i} style={[styles.availLetter, !available && styles.availLetterUsed]} onPress={() => available && handleLetterSelect(char)} disabled={!available}>
                    <Text style={[styles.availLetterText, !available && { color: '#94a3b8' }]}>{char}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.btn, { backgroundColor: '#16a34a', width: '100%', marginTop: 16 }]} onPress={handleUnlock}>
              <Text style={styles.btnPrimaryText}>MỞ KHÓA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Exit Modal */}
      <Modal visible={showExitModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: '#ef4444' }]}>THOÁT GAME?</Text>
            <Text style={{ color: '#666', marginBottom: 24 }}>Tiến trình chơi sẽ không được lưu.</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => {
                setShowExitModal(false);
                gameStatusRef.current = 'playing';
                setGameStatus('playing');
              }}>
                <Text style={styles.btnOutlineText}>Ở Lại</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#ef4444' }]} onPress={handleExitGame}>
                <Home size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Thoát</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Paused (no puzzle, no exit) */}
      {gameStatus === 'paused' && !showPuzzle && !showExitModal && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: '#f59e0b' }]}>TẠM DỪNG</Text>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { width: '100%', marginBottom: 12 }]} onPress={() => {
              gameStatusRef.current = 'playing';
              setGameStatus('playing');
            }}>
              <Play size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Tiếp tục</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOutline, { width: '100%' }]} onPress={() => navigation.goBack()}>
              <Home size={18} color="#4b5563" />
              <Text style={styles.btnOutlineText}>Thoát game</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#93C5FD' },
  sky: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gameArea: { flex: 1, overflow: 'hidden', position: 'relative', justifyContent: 'center' },
  worldContainer: { position: 'absolute', height: 450, top: '50%', marginTop: -225, left: 0, right: 0 },

  // HUD
  hud: { position: 'absolute', top: 40, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', zIndex: 100 },
  hudLeft: { flexDirection: 'row', gap: 8 },
  hudRight: { flexDirection: 'row', gap: 8 },
  hudBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  hudPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 2 },
  hudPillText: { fontSize: 16, fontWeight: 'bold' },

  // Collected letters — sits below HUD (HUD is top:40, buttons are ~36px tall, so top:90)
  collectedBar: { position: 'absolute', top: 90, left: 12, right: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 4, zIndex: 100 },
  collectedLetter: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  collectedLetterText: { fontWeight: 'bold', fontSize: 14, color: '#d97706' },

  // Letter bubble (matching web: white circle with amber border)
  letterBubble: { position: 'absolute' },
  letterCircle: { position: 'absolute', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 3, borderColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' },
  letterText: { fontWeight: 'bold', fontSize: 18, color: '#F59E0B' },

  // Control Bar — paddingBottom pushes buttons UP from safe area bottom
  controlBar: {
    height: 160, backgroundColor: '#1e293b',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 50,
    borderTopWidth: 4, borderTopColor: '#334155',
  },
  dpad: { flexDirection: 'row', gap: 16 },
  dpadBtn: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: '#334155',
    borderBottomWidth: 4, borderBottomColor: '#0f172a',
    alignItems: 'center', justifyContent: 'center',
  },
  jumpBtn: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: '#ef4444',
    borderBottomWidth: 4, borderBottomColor: '#991b1b',
    alignItems: 'center', justifyContent: 'center',
  },

  // Overlays
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
  },
  card: {
    backgroundColor: '#fff', padding: 24, borderRadius: 24, alignItems: 'center', width: '80%',
    borderWidth: 4, borderColor: 'rgba(88, 204, 2, 0.2)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
  },
  cardTitle: { fontSize: 28, fontWeight: '900', marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, gap: 8 },
  btnOutline: { backgroundColor: '#f3f4f6' },
  btnOutlineText: { fontSize: 16, fontWeight: 'bold', color: '#4b5563' },
  btnPrimary: { backgroundColor: '#58CC02' },
  btnPrimaryText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },

  // Instructions
  instructionBox: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12, marginBottom: 12, width: '100%' },
  instructionText: { fontSize: 15, color: '#475569', marginBottom: 4 },

  // Puzzle
  meaningBox: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, width: '100%', alignItems: 'center' },
  meaningText: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  puzzleSlots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 20 },
  puzzleSlot: { width: 38, height: 46, borderBottomWidth: 4, borderBottomColor: '#cbd5e1', backgroundColor: '#f8fafc', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  puzzleSlotFilled: { borderBottomColor: '#f59e0b', backgroundColor: '#fffbeb' },
  puzzleSlotText: { fontSize: 20, fontWeight: 'bold', color: '#94a3b8' },
  availableLetters: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 12, minHeight: 44 },
  availLetter: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  availLetterUsed: { backgroundColor: '#e2e8f0', opacity: 0.5 },
  availLetterText: { fontWeight: 'bold', fontSize: 16, color: '#1e293b' },
});
