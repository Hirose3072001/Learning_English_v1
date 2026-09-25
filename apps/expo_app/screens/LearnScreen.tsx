import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform, Modal } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Star, Lock, CheckCircle2, Languages, ChevronRight, Volume2 } from 'lucide-react-native';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function LearnScreen({ navigation }: any) {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'lessons' | 'pronunciation'>('lessons');
  const [flashcardModalUnit, setFlashcardModalUnit] = useState<any>(null);

  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('*').eq('is_active', true).order('order_index');
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['all-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select('*').eq('is_active', true).order('order_index');
      if (error) throw error;
      return data;
    },
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['user_progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('user_progress').select('lesson_id').eq('user_id', user.id).eq('completed', true);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: characters, isLoading: charactersLoading } = useQuery({
    queryKey: ['characters'],
    queryFn: async () => {
      const { data, error } = await supabase.from('characters').select('*').eq('is_active', true).order('order_index');
      if (error) throw error;
      return data;
    },
  });

  const isLoading = authLoading || unitsLoading || lessonsLoading || progressLoading || charactersLoading;

  const unitsWithLessons = useMemo(() => {
    return (units || []).map((unit) => {
      const unitLessons = (lessons || []).filter((l: any) => l.unit_id === unit.id);
      const completedLessonIds = new Set((progress || []).map((p: any) => p.lesson_id));

      const allLessonsOrdered = (lessons || []).sort((a: any, b: any) => a.order_index - b.order_index);
      const firstIncompleteLessonId = allLessonsOrdered.find((l: any) => !completedLessonIds.has(l.id))?.id;

      const lessonsWithStatus = unitLessons.map((lesson: any) => {
        const isCompleted = completedLessonIds.has(lesson.id);
        let status = 'locked';
        if (isCompleted) status = 'completed';
        else if (lesson.id === firstIncompleteLessonId) status = 'current';

        return { ...lesson, status };
      });

      const completedCount = lessonsWithStatus.filter((l: any) => l.status === 'completed').length;

      return { ...unit, lessons: lessonsWithStatus, completedCount, totalCount: lessonsWithStatus.length };
    });
  }, [units, lessons, progress]);

  const totalCompleted = useMemo(() => unitsWithLessons.reduce((acc, u) => acc + u.completedCount, 0), [unitsWithLessons]);
  const totalLessons = useMemo(() => unitsWithLessons.reduce((acc, u) => acc + u.totalCount, 0), [unitsWithLessons]);

  const vowels = characters?.filter((char: any) => char.type === 'vowel') || [];
  const consonants = characters?.filter((char: any) => char.type === 'consonant') || [];

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#58CC02" />
      </View>
    );
  }

  const renderLessonsTab = () => {
    return (
      <View style={styles.tabContent}>
        {unitsWithLessons.map((unit) => (
          <View key={unit.id} style={styles.unitCard}>
            <View style={styles.unitHeader}>
              <View>
                <Text style={styles.unitTitle}>Chương {unit.order_index}</Text>
                {unit.description && <Text style={styles.unitDescription}>{unit.description}</Text>}
              </View>
              <View style={styles.unitStats}>
                <Text style={styles.unitStatsText}>{unit.completedCount}/{unit.totalCount}</Text>
                <View style={styles.unitPercentBadge}>
                  <Text style={styles.unitPercentText}>
                    {unit.totalCount > 0 ? Math.round((unit.completedCount / unit.totalCount) * 100) : 0}%
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.flashcardButton}
              onPress={() => setFlashcardModalUnit(unit)}
            >
              <View style={styles.flashcardIconWrapper}>
                <BookOpen size={20} color="#58CC02" />
              </View>
              <View style={styles.flashcardTextContainer}>
                <Text style={styles.flashcardTitle}>Từ vựng trong chương</Text>
                <Text style={styles.flashcardSubtitle}>Học qua Flashcard trước khi chơi</Text>
              </View>
              <ChevronRight size={24} color="#58CC02" />
            </TouchableOpacity>

            <View style={styles.lessonList}>
              {unit.lessons.map((lesson: any, index: number) => {
                const isCompleted = lesson.status === 'completed';
                const isCurrent = lesson.status === 'current';
                const isLocked = lesson.status === 'locked';

                return (
                  <TouchableOpacity
                    key={lesson.id}
                    style={[
                      styles.lessonItem,
                      isCompleted && styles.lessonItemCompleted,
                      isCurrent && styles.lessonItemCurrent,
                      isLocked && styles.lessonItemLocked,
                    ]}
                    disabled={isLocked}
                    onPress={() => navigation.navigate('Lesson', { lessonId: lesson.id })}
                  >
                    <View style={[
                      styles.lessonIconContainer,
                      isCompleted && styles.lessonIconCompleted,
                      isCurrent && styles.lessonIconCurrent,
                      isLocked && styles.lessonIconLocked,
                    ]}>
                      {isCompleted ? (
                        <CheckCircle2 size={24} color="#fff" />
                      ) : isLocked ? (
                        <Lock size={20} color="#a1a1aa" />
                      ) : (
                        <Star size={24} color="#fff" />
                      )}
                    </View>
                    
                    <View style={styles.lessonInfo}>
                      <Text style={[
                        styles.lessonName,
                        isCompleted && styles.lessonNameCompleted,
                        isCurrent && styles.lessonNameCurrent,
                        isLocked && styles.lessonNameLocked,
                      ]}>
                        {index + 1}. {lesson.title}
                      </Text>
                      {lesson.description && (
                        <Text style={styles.lessonDesc} numberOfLines={1}>{lesson.description}</Text>
                      )}
                      <View style={styles.lessonMeta}>
                        <Text style={[styles.lessonXP, isCompleted && styles.lessonXPCompleted]}>
                          +{lesson.xp_reward} XP
                        </Text>
                        {isCurrent && (
                          <View style={styles.badgeNext}>
                            <Text style={styles.badgeNextText}>Tiếp theo</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {!isLocked && (
                      <ChevronRight size={24} color={isCompleted ? '#22c55e' : '#58CC02'} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPronunciationTab = () => {
    const renderCharacterCard = (item: any, colorType: 'red' | 'blue') => (
      <TouchableOpacity 
        key={item.id} 
        style={[styles.charCard, colorType === 'red' ? styles.charCardRed : styles.charCardBlue]}
      >
        <View style={styles.charHeader}>
          <Text style={[styles.charLetter, colorType === 'red' ? styles.charTextRed : styles.charTextBlue]}>
            {item.letter}
          </Text>
          <Volume2 size={16} color="#777" />
        </View>
        <Text style={styles.charPronunciation}>{item.pronunciation}</Text>
        <Text style={styles.charExample}>{item.example}</Text>
      </TouchableOpacity>
    );

    return (
      <View style={styles.tabContent}>
        <View style={styles.charSection}>
          <View style={styles.charSectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.charSectionTitle}>Nguyên âm (Vowels) - {vowels.length} chữ</Text>
          </View>
          <View style={styles.charGrid}>
            {vowels.map((v: any) => renderCharacterCard(v, 'red'))}
          </View>
        </View>

        <View style={styles.charSection}>
          <View style={styles.charSectionHeader}>
            <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.charSectionTitle}>Phụ âm (Consonants) - {consonants.length} chữ</Text>
          </View>
          <View style={styles.charGrid}>
            {consonants.map((c: any) => renderCharacterCard(c, 'blue'))}
          </View>
        </View>
      </View>
    );
  };

  const progressPercent = totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Progress Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrapper}>
                <BookOpen size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Hành trình học tập</Text>
                <Text style={styles.headerSubtitle}>Tiếng Anh cơ bản</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.headerStats}>
                <BookOpen size={20} color="#58CC02" />
                <Text style={styles.headerStatsNumber}>{totalCompleted}</Text>
              </View>
              <Text style={styles.headerStatsTotal}>/{totalLessons} bài học</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'lessons' && styles.tabButtonActive]}
            onPress={() => setActiveTab('lessons')}
          >
            <BookOpen size={20} color={activeTab === 'lessons' ? '#58CC02' : '#777'} />
            <Text style={[styles.tabText, activeTab === 'lessons' && styles.tabTextActive]}>Bài học</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'pronunciation' && styles.tabButtonActive]}
            onPress={() => setActiveTab('pronunciation')}
          >
            <Languages size={20} color={activeTab === 'pronunciation' ? '#58CC02' : '#777'} />
            <Text style={[styles.tabText, activeTab === 'pronunciation' && styles.tabTextActive]}>Phát âm</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'lessons' ? renderLessonsTab() : renderPronunciationTab()}
      </ScrollView>

      {/* Flashcard Modal */}
      <Modal
        visible={!!flashcardModalUnit}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFlashcardModalUnit(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn bài học Flashcard</Text>
              <TouchableOpacity onPress={() => setFlashcardModalUnit(null)}>
                <Text style={styles.modalCloseText}>Đóng</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  navigation.navigate('Flashcards', { 
                    unitId: flashcardModalUnit.id, 
                    lessonIds: flashcardModalUnit.lessons.map((l: any) => l.id) 
                  });
                  setFlashcardModalUnit(null);
                }}
              >
                <View style={styles.modalOptionIconWrapper}>
                  <BookOpen size={20} color="#58CC02" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionTitle}>Toàn bộ Chương {flashcardModalUnit?.order_index}</Text>
                  <Text style={styles.modalOptionSubtitle}>Học tất cả từ vựng trong chương</Text>
                </View>
                <ChevronRight size={20} color="#a1a1aa" />
              </TouchableOpacity>

              {flashcardModalUnit?.lessons.map((lesson: any, index: number) => (
                <TouchableOpacity
                  key={lesson.id}
                  style={styles.modalOption}
                  onPress={() => {
                    navigation.navigate('Flashcards', { 
                      unitId: flashcardModalUnit.id, 
                      lessonIds: [lesson.id] 
                    });
                    setFlashcardModalUnit(null);
                  }}
                >
                  <View style={[styles.modalOptionIconWrapper, { backgroundColor: '#f4f4f5' }]}>
                    <Text style={{ fontWeight: 'bold', color: '#777' }}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalOptionTitle}>{lesson.title}</Text>
                    <Text style={styles.modalOptionSubtitle}>Từ vựng bài {index + 1}</Text>
                  </View>
                  <ChevronRight size={20} color="#a1a1aa" />
                </TouchableOpacity>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(88, 204, 2, 0.2)',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconWrapper: {
    width: 48,
    height: 48,
    backgroundColor: '#58CC02',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 14, color: '#777' },
  headerRight: { alignItems: 'flex-end' },
  headerStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerStatsNumber: { fontSize: 24, fontWeight: 'bold', color: '#58CC02' },
  headerStatsTotal: { fontSize: 12, color: '#777' },
  progressBarBg: { height: 12, backgroundColor: '#e5e5e5', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#58CC02', borderRadius: 6 },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#e5e5e5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
    borderRadius: 8,
  },
  tabButtonActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 16, fontWeight: 'bold', color: '#777' },
  tabTextActive: { color: '#58CC02' },
  tabContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },
  unitCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    overflow: 'hidden',
    marginBottom: 16,
  },
  unitHeader: {
    backgroundColor: '#f4f4f5',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  unitTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  unitDescription: { fontSize: 14, color: '#777', marginTop: 4 },
  unitStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitStatsText: { fontSize: 14, fontWeight: '600', color: '#777' },
  unitPercentBadge: {
    backgroundColor: 'rgba(88, 204, 2, 0.1)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitPercentText: { fontSize: 14, fontWeight: 'bold', color: '#58CC02' },
  flashcardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(88, 204, 2, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  flashcardIconWrapper: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(88, 204, 2, 0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  flashcardTextContainer: { flex: 1 },
  flashcardTitle: { fontSize: 16, fontWeight: 'bold', color: '#58CC02', marginBottom: 2 },
  flashcardSubtitle: { fontSize: 12, color: '#777' },
  lessonList: { padding: 12, gap: 12 },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  lessonItemCompleted: { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' },
  lessonItemCurrent: { backgroundColor: 'rgba(88, 204, 2, 0.1)', borderColor: '#58CC02' },
  lessonItemLocked: { opacity: 0.6 },
  lessonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  lessonIconCompleted: { backgroundColor: '#22c55e' },
  lessonIconCurrent: { backgroundColor: '#58CC02' },
  lessonIconLocked: { backgroundColor: '#e5e5e5' },
  lessonInfo: { flex: 1 },
  lessonName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  lessonNameCompleted: { color: '#15803d' },
  lessonNameCurrent: { color: '#58CC02' },
  lessonNameLocked: { color: '#a1a1aa' },
  lessonDesc: { fontSize: 14, color: '#777', marginBottom: 4 },
  lessonMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lessonXP: { fontSize: 12, fontWeight: '600', color: '#777' },
  lessonXPCompleted: { color: '#16a34a' },
  badgeNext: { backgroundColor: 'rgba(88, 204, 2, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeNextText: { fontSize: 12, fontWeight: 'bold', color: '#58CC02' },
  charSection: { marginBottom: 24 },
  charSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  charSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  charGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  charCard: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  charCardRed: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  charCardBlue: { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  charHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 },
  charLetter: { fontSize: 24, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  charTextRed: { color: '#dc2626' },
  charTextBlue: { color: '#2563eb' },
  charPronunciation: { fontSize: 12, color: '#777', marginBottom: 4 },
  charExample: { fontSize: 14, fontWeight: '600', color: '#333' },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: { 
    width: '90%',
    backgroundColor: '#fff', 
    borderRadius: 24, 
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalCloseText: { fontSize: 16, color: '#777', fontWeight: 'bold' },
  modalBody: { padding: 16 },
  modalOption: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#e5e5e5', marginBottom: 12 },
  modalOptionIconWrapper: { width: 40, height: 40, backgroundColor: 'rgba(88, 204, 2, 0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  modalOptionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  modalOptionSubtitle: { fontSize: 12, color: '#777' },
});
