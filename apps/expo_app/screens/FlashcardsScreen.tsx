import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { ChevronLeft, ChevronRight, RotateCcw, Volume2, Shuffle, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import * as Speech from 'expo-speech';
import { supabase } from '../supabase/client';

const { width } = Dimensions.get('window');

export default function FlashcardsScreen({ route, navigation }: any) {
  const { unitId, lessonIds } = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<string>>(new Set());
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  // Animation values
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Fetch vocabulary for the unit's lessons
  const { data: vocabulary, isLoading } = useQuery({
    queryKey: ['vocabulary-unit', unitId],
    queryFn: async () => {
      if (!lessonIds || lessonIds.length === 0) return [];
      const { data, error } = await supabase
        .from('vocabulary')
        .select('*')
        .in('lesson_id', lessonIds)
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      return data;
    },
    enabled: !!lessonIds && lessonIds.length > 0,
  });

  const cards = vocabulary || [];
  const totalCards = cards.length;
  const progressPercent = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;

  useEffect(() => {
    if (cards.length > 0 && shuffledIndices.length === 0) {
      setShuffledIndices(cards.map((_, i) => i));
    }
  }, [cards, shuffledIndices.length]);

  const currentCardIndex = shuffledIndices[currentIndex] ?? 0;
  const currentCard = cards[currentCardIndex];

  const speak = (text: string) => {
    Speech.speak(text, { language: 'en-US', rate: 0.9 });
  };

  const handleFlip = () => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const resetFlip = () => {
    flipAnim.setValue(0);
    setIsFlipped(false);
  };

  const handleNext = () => {
    if (currentIndex < totalCards - 1) {
      resetFlip();
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      resetFlip();
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleKnown = () => {
    if (currentCard) {
      const newKnown = new Set(knownCards).add(currentCard.id);
      const newUnknown = new Set(unknownCards);
      newUnknown.delete(currentCard.id);
      setKnownCards(newKnown);
      setUnknownCards(newUnknown);
    }
    handleNext();
  };

  const handleUnknown = () => {
    if (currentCard) {
      const newUnknown = new Set(unknownCards).add(currentCard.id);
      const newKnown = new Set(knownCards);
      newKnown.delete(currentCard.id);
      setUnknownCards(newUnknown);
      setKnownCards(newKnown);
    }
    handleNext();
  };

  const handleShuffle = () => {
    const newIndices = [...shuffledIndices].sort(() => Math.random() - 0.5);
    setShuffledIndices(newIndices);
    resetFlip();
    setCurrentIndex(0);
  };

  const handleReset = () => {
    resetFlip();
    setCurrentIndex(0);
    setKnownCards(new Set());
    setUnknownCards(new Set());
    setShuffledIndices(cards.map((_, i) => i));
  };

  // Interpolate animations
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
    opacity: frontOpacity,
  };
  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
    opacity: backOpacity,
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#58CC02" />
      </View>
    );
  }

  if (totalCards === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <XCircle size={48} color="#a1a1aa" style={{ marginBottom: 16 }} />
        <Text style={styles.errorTitle}>Chưa có từ vựng</Text>
        <Text style={styles.errorSubtitle}>Chương này chưa có thẻ từ vựng nào.</Text>
        <TouchableOpacity style={styles.buttonMain} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonMainText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCompleted = currentIndex >= totalCards - 1 && (knownCards.has(currentCard?.id || '') || unknownCards.has(currentCard?.id || ''));

  if (isCompleted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🎉</Text>
          <Text style={styles.errorTitle}>Hoàn thành!</Text>
          <Text style={styles.errorSubtitle}>Bạn đã xem hết {totalCards} từ vựng</Text>

          <View style={styles.statsContainer}>
            <View style={[styles.statBox, { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' }]}>
              <CheckCircle2 size={32} color="#16a34a" />
              <Text style={[styles.statNumber, { color: '#16a34a' }]}>{knownCards.size}</Text>
              <Text style={styles.statLabel}>Đã thuộc</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <XCircle size={32} color="#dc2626" />
              <Text style={[styles.statNumber, { color: '#dc2626' }]}>{unknownCards.size}</Text>
              <Text style={styles.statLabel}>Cần ôn lại</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.buttonMain, { width: '100%', marginBottom: 12 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonMainText}>Xong</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.buttonOutline, { width: '100%' }]} onPress={handleReset}>
            <Text style={styles.buttonOutlineText}>Học lại từ đầu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Flashcards</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShuffle} style={styles.iconButton}>
            <Shuffle size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReset} style={styles.iconButton}>
            <RotateCcw size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressTopRow}>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>Thẻ {totalCards > 0 ? currentIndex + 1 : 0} / {totalCards}</Text>
          </View>
          <View style={styles.scoreBadges}>
            <View style={[styles.scoreBadge, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
              <CheckCircle2 size={14} color="#16a34a" />
              <Text style={[styles.scoreText, { color: '#16a34a' }]}>{knownCards.size}</Text>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <XCircle size={14} color="#dc2626" />
              <Text style={[styles.scoreText, { color: '#dc2626' }]}>{unknownCards.size}</Text>
            </View>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Card Area */}
      <View style={styles.cardArea}>
        <TouchableOpacity activeOpacity={1} onPress={handleFlip} style={styles.cardWrapper}>
          {/* Front */}
          <Animated.View style={[styles.card, frontAnimatedStyle]}>
            <TouchableOpacity 
              style={styles.speakerButton} 
              onPress={(e) => { e.stopPropagation(); speak(currentCard?.word || ''); }}
            >
              <Volume2 size={24} color="#58CC02" />
            </TouchableOpacity>
            <Text style={styles.wordText}>{currentCard?.word}</Text>
            {currentCard?.pronunciation && (
              <Text style={styles.pronunciationText}>{currentCard.pronunciation}</Text>
            )}
            <Text style={styles.hintText}>Nhấn để lật thẻ</Text>
          </Animated.View>

          {/* Back */}
          <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
            <Text style={styles.meaningText}>{currentCard?.meaning}</Text>
            <Text style={styles.wordSubText}>{currentCard?.word}</Text>
            {currentCard?.example && (
              <View style={styles.exampleBox}>
                <Text style={styles.exampleLabel}>Ví dụ:</Text>
                <Text style={styles.exampleText}>{currentCard.example}</Text>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsArea}>
        <View style={styles.mainActions}>
          <TouchableOpacity style={[styles.actionButton, styles.btnUnknown]} onPress={handleUnknown}>
            <XCircle size={24} color="#ef4444" />
            <Text style={styles.btnUnknownText}>Chưa thuộc</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.btnKnown]} onPress={handleKnown}>
            <CheckCircle2 size={24} color="#fff" />
            <Text style={styles.btnKnownText}>Đã thuộc</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navActions}>
          <TouchableOpacity style={styles.iconButton} onPress={handlePrev} disabled={currentIndex === 0}>
            <ChevronLeft size={32} color={currentIndex === 0 ? '#d4d4d8' : '#333'} />
          </TouchableOpacity>
          <Text style={styles.navText}>Vuốt hoặc nhấn</Text>
          <TouchableOpacity style={styles.iconButton} onPress={handleNext} disabled={currentIndex >= totalCards - 1}>
            <ChevronRight size={32} color={currentIndex >= totalCards - 1 ? '#d4d4d8' : '#333'} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  iconButton: { padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerActions: { flexDirection: 'row', gap: 4 },
  progressSection: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  counterBadge: { backgroundColor: '#f4f4f5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: '#e5e5e5' },
  counterText: { fontSize: 12, fontWeight: 'bold', color: '#777' },
  scoreBadges: { flexDirection: 'row', gap: 8 },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  scoreText: { fontSize: 12, fontWeight: 'bold' },
  progressBarBg: { height: 8, backgroundColor: '#e5e5e5', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#58CC02', borderRadius: 4 },
  cardArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  cardWrapper: { width: width - 48, height: width - 48, minHeight: 320, maxHeight: 400 },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e5e5',
    position: 'absolute',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardBack: {
    backgroundColor: 'rgba(88, 204, 2, 0.05)',
    borderColor: 'rgba(88, 204, 2, 0.3)',
  },
  speakerButton: { position: 'absolute', top: 16, right: 16, padding: 12, backgroundColor: 'rgba(88, 204, 2, 0.1)', borderRadius: 12 },
  wordText: { fontSize: 36, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center' },
  pronunciationText: { fontSize: 20, color: '#777', marginBottom: 24 },
  hintText: { fontSize: 14, color: '#a1a1aa', position: 'absolute', bottom: 24 },
  meaningText: { fontSize: 32, fontWeight: 'bold', color: '#58CC02', marginBottom: 16, textAlign: 'center' },
  wordSubText: { fontSize: 20, color: '#777', marginBottom: 24 },
  exampleBox: { width: '100%', backgroundColor: '#f4f4f5', padding: 16, borderRadius: 16 },
  exampleLabel: { fontSize: 14, color: '#777', marginBottom: 4 },
  exampleText: { fontSize: 16, fontWeight: '600', color: '#333' },
  actionsArea: { padding: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e5e5' },
  mainActions: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 2, gap: 8 },
  btnUnknown: { borderColor: 'rgba(239, 68, 68, 0.5)', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  btnUnknownText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
  btnKnown: { borderColor: '#16a34a', backgroundColor: '#22c55e' },
  btnKnownText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  navActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  navText: { fontSize: 14, color: '#a1a1aa', fontWeight: '500' },
  errorTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  errorSubtitle: { fontSize: 16, color: '#777', textAlign: 'center', marginBottom: 24 },
  buttonMain: { backgroundColor: '#58CC02', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  buttonMainText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonOutline: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 2, borderColor: '#e5e5e5' },
  buttonOutlineText: { color: '#777', fontSize: 16, fontWeight: 'bold' },
  statsContainer: { flexDirection: 'row', gap: 16, marginBottom: 32, width: '100%' },
  statBox: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 2, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', marginVertical: 8 },
  statLabel: { fontSize: 14, color: '#777' },
});
