import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, SafeAreaView, TouchableOpacity, Dimensions, Animated, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, BackHandler } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Trophy, Zap, ArrowLeft, RotateCcw } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Assets
const CASTLE_IMG = require('../assets/images/castle_v2.png');
const CASTLE_DAMAGE_IMG = require('../assets/images/castle_damage_v2.png');
const MONSTER_SPRITES = {
  pink: { up: require('../assets/images/monster_up.png'), down: require('../assets/images/monster_down.png') },
  green: { up: require('../assets/images/monster_green_up.png'), down: require('../assets/images/monster_green_down.png') },
  yellow: { up: require('../assets/images/monster_yellow_up.png'), down: require('../assets/images/monster_yellow_down.png') },
};

// Game Constants
const SPAWN_RATE = 2000;
const FALL_SPEED = 2; // Pixels per frame
const MONSTER_WIDTH = 64;
const MONSTER_HEIGHT = 64;
// Castle height roughly 50% of screen height
const CASTLE_HEIGHT = SCREEN_HEIGHT * 0.5;
// Determine collision boundary (roughly where castle top is)
const COLLISION_Y = SCREEN_HEIGHT - CASTLE_HEIGHT - 60; // 60 for safe margin

interface Monster {
  id: string;
  displayWord: string;
  translation: string;
  x: number;
  y: number;
  type: 'pink' | 'green' | 'yellow';
  frame: 0 | 1; // 0 for up, 1 for down
}

export default function WordDefenseScreen({ navigation }: any) {
  const { user } = useAuth();
  
  const [gameStatus, setGameStatus] = useState<'start' | 'playing' | 'paused' | 'gameover'>('start');
  const [showExitModal, setShowExitModal] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [combo, setCombo] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [castleDamaged, setCastleDamaged] = useState(false);
  
  const [monsters, setMonsters] = useState<Monster[]>([]);
  
  const inputRef = useRef<TextInput>(null);
  const requestRef = useRef<number>();
  const lastSpawnRef = useRef<number>(Date.now());
  const lastSpawnXRef = useRef<number>(SCREEN_WIDTH / 2);
  const lastUpdateRef = useRef<number>(Date.now());
  const scoreRef = useRef(0);
  const livesRef = useRef(5);
  const monstersRef = useRef<Monster[]>([]);
  const gameStatusRef = useRef<'start' | 'playing' | 'gameover'>('start');

  const { data: vocabulary, isLoading } = useQuery({
    queryKey: ['vocabulary-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vocabulary').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const startGame = useCallback(() => {
    setGameStatus('playing');
    setScore(0);
    setLives(5);
    setCombo(0);
    setInputValue('');
    setMonsters([]);
    setCastleDamaged(false);
    
    scoreRef.current = 0;
    livesRef.current = 5;
    monstersRef.current = [];
    gameStatusRef.current = 'playing';
    lastSpawnRef.current = 0; // Spawn immediately
    lastUpdateRef.current = Date.now();
    
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleBackPress = useCallback(() => {
    if (gameStatusRef.current === 'playing') {
      setGameStatus('paused');
      gameStatusRef.current = 'paused';
      setShowExitModal(true);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      backHandler.remove();
    };
  }, [handleBackPress]);

  const handleExitGame = () => {
    setShowExitModal(false);
    gameStatusRef.current = 'gameover';
    setGameStatus('gameover');
    handleGameOver(scoreRef.current);
  };

  const spawnMonster = useCallback(() => {
    if (!vocabulary || vocabulary.length === 0) return;
    
    const randomWord = vocabulary[Math.floor(Math.random() * vocabulary.length)];
    let randomX = Math.random() * (SCREEN_WIDTH - MONSTER_WIDTH - 40) + 20;
    
    // Ensure it's not too close to the last one
    if (Math.abs(randomX - lastSpawnXRef.current) < MONSTER_WIDTH * 1.5) {
      randomX = (randomX + SCREEN_WIDTH / 2) % (SCREEN_WIDTH - MONSTER_WIDTH - 40) + 20;
    }
    lastSpawnXRef.current = randomX;
    
    const types: ('pink'|'green'|'yellow')[] = ['pink', 'green', 'yellow'];
    const type = types[Math.floor(Math.random() * types.length)];
    const useEnglish = Math.random() > 0.5;
    
    if (!randomWord || !randomWord.word || !randomWord.meaning) return;

    const newMonster: Monster = {
      id: Math.random().toString(36).substring(7),
      displayWord: useEnglish ? randomWord.word : randomWord.meaning,
      translation: useEnglish ? randomWord.meaning : randomWord.word,
      x: randomX,
      y: -MONSTER_HEIGHT - 50,
      type: type,
      frame: Math.random() > 0.5 ? 0 : 1,
    };
    
    monstersRef.current = [...monstersRef.current, newMonster];
    setMonsters([...monstersRef.current]);
  }, [vocabulary]);

  const updateGame = useCallback(() => {
    if (gameStatusRef.current !== 'playing') return;

    const now = Date.now();
    const dt = now - lastUpdateRef.current;
    lastUpdateRef.current = now;
    
    const currentLevel = Math.floor(scoreRef.current / 100) + 1;
    // Start at 5000ms, decrease by 500ms per level, minimum 1500ms
    const currentSpawnRate = Math.max(1500, 5000 - (currentLevel - 1) * 500);
    
    if (now - lastSpawnRef.current > currentSpawnRate) {
      spawnMonster();
      lastSpawnRef.current = now;
    }

    let livesLost = 0;
    // Base speed: 10 pixels per second, increases by 3 per level
    const speedPerSecond = 10 + (currentLevel - 1) * 3;
    const currentSpeed = (speedPerSecond * dt) / 1000;
    
    // Toggle frame every ~500ms based on time
    const frameToggle = Math.floor(now / 500) % 2 === 0 ? 0 : 1;
    
    const updatedMonsters = monstersRef.current.map(m => ({ 
      ...m, 
      y: m.y + currentSpeed,
      frame: frameToggle as 0 | 1
    }));
    
    const survivedMonsters = updatedMonsters.filter(m => {
      // If monster reaches the castle
      if (m.y >= COLLISION_Y) {
        livesLost += 1;
        return false;
      }
      return true;
    });

    if (livesLost > 0) {
      livesRef.current -= livesLost;
      setLives(livesRef.current);
      setCombo(0);
      
      setCastleDamaged(true);
      setTimeout(() => setCastleDamaged(false), 300);
      
      if (livesRef.current <= 0) {
        gameStatusRef.current = 'gameover';
        setGameStatus('gameover');
        handleGameOver(scoreRef.current);
      }
    }

    monstersRef.current = survivedMonsters;
    setMonsters(survivedMonsters);

    if (gameStatusRef.current === 'playing' || gameStatusRef.current === 'paused') {
      requestRef.current = requestAnimationFrame(updateGame);
    }
  }, [spawnMonster]);

  useEffect(() => {
    if (!isLoading && gameStatus === 'playing') {
      lastUpdateRef.current = Date.now();
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isLoading, gameStatus, updateGame]);

  const handleGameOver = async (finalScore: number) => {
    if (!user?.id || finalScore <= 0) return;
    try {
      const { data: profile } = await supabase.from('profiles').select('xp').eq('user_id', user.id).single();
      const currentXP = profile?.xp || 0;
      const earnedXP = Math.floor(finalScore / 10);
      if (earnedXP > 0) {
        await supabase.from('profiles').update({ xp: currentXP + earnedXP }).eq('user_id', user.id);
        await supabase.from('xp_logs').insert({ user_id: user.id, amount: earnedXP, source: 'word_defense' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleInputSubmit = () => {
    const text = inputValue.trim().toLowerCase();
    if (!text) return;

    const hitIndex = monstersRef.current.findIndex(m => m.translation.toLowerCase() === text);
    
    if (hitIndex >= 0) {
      const newMonsters = [...monstersRef.current];
      newMonsters.splice(hitIndex, 1);
      
      monstersRef.current = newMonsters;
      setMonsters(newMonsters);
      
      setCombo(c => c + 1);
      const points = 10 + Math.floor(combo / 5) * 5;
      scoreRef.current += points;
      setScore(scoreRef.current);
    } else {
      setCombo(0);
    }
    
    setInputValue('');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 12, color: '#777' }}>Đang tải màn chơi...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Gradient (Sky Blue) */}
        <LinearGradient
          colors={['#38bdf8', '#0284c7']}
          style={styles.backgroundLayer}
        />

      {/* Header HUD */}
      <View style={styles.hud}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => {
            if (gameStatus === 'playing') {
              handleBackPress();
            } else {
              navigation.goBack();
            }
          }}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Trophy size={16} color="#fbbf24" />
            <Text style={styles.statText}>{score}</Text>
          </View>
          <View style={styles.statBox}>
            <Heart size={16} color="#ef4444" fill="#ef4444" />
            <Text style={styles.statText}>{lives}</Text>
          </View>
          <View style={styles.statBox}>
            <Zap size={16} color="#3b82f6" />
            <Text style={styles.statText}>x{combo}</Text>
          </View>
        </View>
      </View>

      {/* Game Area */}
      <View style={styles.gameArea}>
        
        {/* Castle Area - Absolute positioned at bottom (rendered first to be under monsters) */}
        <View style={styles.castleContainer} pointerEvents="none">
          <Image 
            source={castleDamaged ? CASTLE_DAMAGE_IMG : CASTLE_IMG} 
            style={styles.castleImage} 
            contentFit="cover" 
            contentPosition="top"
          />
        </View>

        {/* Render Monsters */}
        {monsters.map(monster => {
          const spriteSource = MONSTER_SPRITES[monster.type][monster.frame === 0 ? 'up' : 'down'];
          // Fallback color if image fails to load
          const fallbackColor = monster.type === 'pink' ? '#ec4899' : monster.type === 'green' ? '#22c55e' : '#eab308';
          return (
            <View 
              key={monster.id} 
              style={[
                styles.monsterContainer, 
                { left: monster.x, top: monster.y, backgroundColor: 'transparent' } // Keep transparent container
              ]}
            >
              <Image 
                source={spriteSource} 
                style={styles.monsterImage} 
                contentFit="contain" 
                transition={200}
                cachePolicy="memory-disk"
              />
              
              {/* Word Board below monster (overlapping to look grabbed) */}
              <View style={styles.wordBoard}>
                <View style={styles.boardBoltTopLeft} />
                <View style={styles.boardBoltTopRight} />
                <View style={styles.boardBoltBottomLeft} />
                <View style={styles.boardBoltBottomRight} />
                <Text style={styles.boardText}>{monster.displayWord}</Text>
              </View>
            </View>
          );
        })}
        
        {/* Input Area - Positioned at the top */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Nhập bản dịch..."
              placeholderTextColor="#9ca3af"
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleInputSubmit}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
              blurOnSubmit={false}
            />
          </View>
        </View>

      </View>

      {/* Full Screen Red Damage Flash */}
      {castleDamaged && (
        <View style={styles.damageFlash} pointerEvents="none" />
      )}

      {/* Start Screen overlay */}
      {gameStatus === 'start' && (
        <View style={styles.gameOverOverlay}>
          <View style={styles.gameOverCard}>
            <Text style={[styles.gameOverTitle, { color: '#38bdf8' }]}>Thủ Thành</Text>
            <Text style={{ color: '#666', fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 24 }}>
              Nhập đúng nghĩa của từ xuất hiện trên đầu quái vật để tiêu diệt chúng!
            </Text>
            <View style={styles.gameOverActions}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => navigation.goBack()}>
                <ArrowLeft size={20} color="#4b5563" />
                <Text style={styles.btnOutlineText}>Thoát</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={startGame}>
                <Zap size={20} color="#fff" />
                <Text style={styles.btnPrimaryText}>Bắt đầu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Game Over Modal overlay */}
      {gameStatus === 'gameover' && (
        <View style={styles.gameOverOverlay}>
          <View style={styles.gameOverCard}>
            <Text style={styles.gameOverTitle}>Game Over!</Text>
            <Text style={styles.gameOverScore}>Điểm: {score}</Text>
            <Text style={styles.gameOverXP}>+{Math.floor(score / 10)} XP</Text>
            
            <View style={styles.gameOverActions}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => navigation.goBack()}>
                <ArrowLeft size={20} color="#4b5563" />
                <Text style={styles.btnOutlineText}>Thoát</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={startGame}>
                <RotateCcw size={20} color="#fff" />
                <Text style={styles.btnPrimaryText}>Chơi lại</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Exit Confirmation Modal */}
      <Modal
        visible={showExitModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Bạn có muốn thoát?</Text>
            <Text style={styles.modalMessage}>Điểm của bạn sẽ được lưu lại tới thời điểm hiện tại.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]} 
                onPress={() => {
                  setShowExitModal(false);
                  gameStatusRef.current = 'playing';
                  setGameStatus('playing');
                }}
              >
                <Text style={styles.modalBtnCancelText}>Tiếp tục</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnExit]} 
                onPress={handleExitGame}
              >
                <Text style={styles.modalBtnExitText}>Thoát</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c4a6e' },
  backgroundLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  center: { justifyContent: 'center', alignItems: 'center' },
  
  hud: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, zIndex: 100 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsContainer: { flexDirection: 'row', gap: 8 },
  statBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  
  gameArea: { flex: 1, position: 'relative', overflow: 'hidden' },
  
  monsterContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: MONSTER_WIDTH,
    height: MONSTER_HEIGHT,
    justifyContent: 'flex-start',
    overflow: 'visible',
    zIndex: 10,
  },
  monsterFallback: {
    position: 'absolute',
    top: 10,
    width: MONSTER_WIDTH - 20,
    height: MONSTER_HEIGHT - 20,
    borderRadius: 20,
    opacity: 0.5, // visible only if image is broken/transparent
  },
  monsterImage: {
    width: MONSTER_WIDTH,
    height: MONSTER_HEIGHT,
    position: 'absolute',
    top: 0,
  },
  
  wordBoard: {
    position: 'absolute',
    top: MONSTER_HEIGHT - 12,
    backgroundColor: '#292524', // stone-800
    borderWidth: 2,
    borderColor: '#57534e', // stone-600
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  boardBoltTopLeft: { position: 'absolute', top: 4, left: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: '#78716c' },
  boardBoltTopRight: { position: 'absolute', top: 4, right: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: '#78716c' },
  boardBoltBottomLeft: { position: 'absolute', bottom: 4, left: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: '#78716c' },
  boardBoltBottomRight: { position: 'absolute', bottom: 4, right: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: '#78716c' },
  boardText: { fontSize: 16, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  
  castleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: CASTLE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 5,
  },
  castleImage: {
    width: '100%',
    height: '100%',
  },
  
  inputContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.6)', // translucent gray-800
    borderWidth: 4,
    borderColor: '#eab308', // yellow-500
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: 60,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  submitBtn: {
    backgroundColor: '#eab308',
    height: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalBtnCancelText: {
    color: '#4b5563',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBtnExit: {
    backgroundColor: '#ef4444',
  },
  modalBtnExitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  damageFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.4)', // red-500 with opacity
    zIndex: 1500,
  },
  
  gameOverOverlay: { 
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    alignItems: 'center', justifyContent: 'center', zIndex: 2000 
  },
  gameOverCard: { 
    backgroundColor: '#fff', padding: 32, borderRadius: 24, alignItems: 'center', width: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 
  },
  gameOverTitle: { fontSize: 32, fontWeight: '900', color: '#ef4444', marginBottom: 16 },
  gameOverScore: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  gameOverXP: { fontSize: 18, fontWeight: 'bold', color: '#eab308', marginBottom: 32 },
  
  gameOverActions: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, gap: 8 },
  btnOutline: { backgroundColor: '#f3f4f6' },
  btnOutlineText: { fontSize: 16, fontWeight: 'bold', color: '#4b5563' },
  btnPrimary: { backgroundColor: '#58CC02' },
  btnPrimaryText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
});
