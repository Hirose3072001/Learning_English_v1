import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import { X, Heart, CheckCircle2, XCircle, Sparkles, Volume2 } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Speech from 'expo-speech';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function LessonScreen({ route, navigation }: any) {
  const { lessonId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hearts, setHearts] = useState(5);
  const [correctCount, setCorrectCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isUsingRecoveryItem, setIsUsingRecoveryItem] = useState(false);

  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.from('lessons').select('*').eq('id', lessonId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['questions', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;

      return (data || []).map((q: any) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
      }));
    },
    enabled: !!lessonId,
  });

  // Fetch recovery items from inventory
  const { data: recoveryItems } = useQuery({
    queryKey: ['user-recovery-items', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_shop_items' as any)
        .select('id, shop_item_id, quantity, shop_items!inner(name, effect_value)')
        .eq('user_id', user.id)
        .eq('shop_items.type', 'heart_restore')
        .gt('quantity', 0)
        .limit(1);
      if (error) throw error;
      return (data || []).filter((item: any) => item.shop_items != null);
    },
    enabled: !!user?.id,
  });

  const isLoading = lessonLoading || questionsLoading;
  const currentQuestion = questions?.[currentQuestionIndex];
  const totalQuestions = questions?.length || 0;
  const progressPercent = totalQuestions > 0 ? (currentQuestionIndex / totalQuestions) * 100 : 0;

  const speak = (text: string) => {
    Speech.speak(text, { language: 'en-US', rate: 0.9 });
  };

  const handleSelectAnswer = (index: number, optionText: string) => {
    if (isAnswered || isChecking) return;
    setSelectedAnswer(index);
    speak(optionText);
  };

  const handleCheckAnswer = async () => {
    if (selectedAnswer === null || !currentQuestion || isChecking) return;
    setIsChecking(true);

    try {
      const isCorrectAnswer = selectedAnswer === currentQuestion.correct_index;
      setIsCorrect(isCorrectAnswer);
      setIsAnswered(true);

      if (isCorrectAnswer) {
        setCorrectCount((prev) => prev + 1);
      } else {
        const newHearts = hearts - 1;
        setHearts(newHearts);

        // When hearts hit 0, ask user if they want to use a potion
        if (newHearts <= 0 && recoveryItems && recoveryItems.length > 0 && (recoveryItems[0] as any)?.shop_items) {
          const item = recoveryItems[0] as any;
          const recoveryAmount = item.shop_items.effect_value;

          Alert.alert(
            '❤️ Hết mạng rồi!',
            `Bạn có muốn dùng thuốc hồi phục +${recoveryAmount} mạng không? (Còn lại: x${item.quantity})`,
            [
              {
                text: 'Thoát',
                style: 'cancel',
                onPress: () => navigation.goBack(),
              },
              {
                text: 'Sử dụng',
                onPress: async () => {
                  setIsUsingRecoveryItem(true);
                  try {
                    if (item.quantity > 1) {
                      const { error } = await supabase
                        .from('user_shop_items' as any)
                        .update({ quantity: item.quantity - 1, used_at: new Date().toISOString() })
                        .eq('id', item.id)
                        .eq('user_id', user?.id);
                      if (error) throw error;
                    } else {
                      const { error } = await supabase
                        .from('user_shop_items' as any)
                        .delete()
                        .eq('id', item.id)
                        .eq('user_id', user?.id);
                      if (error) throw error;
                    }
                    // Invalidate all inventory-related queries
                    queryClient.invalidateQueries({ queryKey: ['user-recovery-items'] });
                    queryClient.invalidateQueries({ queryKey: ['user-inventory-details'] });
                    queryClient.invalidateQueries({ queryKey: ['profile'] });
                    setHearts(Math.min(5, recoveryAmount));
                  } catch (err: any) {
                    console.error('Use recovery item failed:', err);
                    Alert.alert('Lỗi', err?.message || 'Không thể sử dụng thuốc. Vui lòng thử lại.');
                  } finally {
                    setIsUsingRecoveryItem(false);
                  }
                },
              },
            ],
            { cancelable: false }
          );
        }
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsChecking(false);
    }
  };

  const handleContinue = async () => {
    if (hearts <= 0) {
      Alert.alert('Hết mạng!', 'Bạn đã hết mạng và không còn thuốc hồi phục. Vui lòng quay lại.', [
        { text: 'Thoát', onPress: () => navigation.goBack() }
      ]);
      return;
    }

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(false);
    } else {
      // Lesson completed
      if (user && lesson) {
        const { data: existingProgress } = await supabase
          .from('user_progress')
          .select('id')
          .eq('user_id', user.id)
          .eq('lesson_id', lesson.id)
          .maybeSingle();

        if (!existingProgress) {
          await supabase.from('user_progress').insert({
            user_id: user.id,
            lesson_id: lesson.id,
            completed: true,
            completed_at: new Date().toISOString(),
            score: Math.round((correctCount / totalQuestions) * 100),
          });

          // Update XP
          const { data: profile } = await supabase.from('profiles').select('xp').eq('user_id', user.id).maybeSingle();
          if (profile) {
            await supabase.from('profiles').update({ xp: profile.xp + lesson.xp_reward }).eq('user_id', user.id);
            await supabase.from('xp_logs').insert({ user_id: user.id, amount: lesson.xp_reward, source: 'lesson' });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['user_progress'] });
      queryClient.invalidateQueries({ queryKey: ['all-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      Alert.alert('Hoàn thành bài học!', `Bạn đã hoàn thành với số điểm ${Math.round((correctCount / totalQuestions) * 100)}% và nhận được +${lesson?.xp_reward || 0} XP`, [
        { text: 'Tuyệt vời!', onPress: () => navigation.goBack() }
      ]);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#58CC02" />
      </View>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <XCircle size={48} color="#a1a1aa" style={{ marginBottom: 16 }} />
        <Text style={styles.errorTitle}>Chưa có câu hỏi</Text>
        <Text style={styles.errorSubtitle}>Bài học này chưa có câu hỏi nào.</Text>
        <TouchableOpacity style={styles.exitButton} onPress={() => navigation.goBack()}>
          <Text style={styles.exitButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <X size={24} color="#a1a1aa" />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>
        <View style={styles.heartsContainer}>
          <Heart size={24} color="#FF4B4B" fill="#FF4B4B" />
          <Text style={styles.heartsText}>{hearts}</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.questionIndexText}>Câu {currentQuestionIndex + 1}/{totalQuestions}</Text>
        <Text style={styles.questionText}>{currentQuestion?.question}</Text>

        <View style={styles.optionsContainer}>
          {currentQuestion?.options.map((option: string, index: number) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = isAnswered && index === currentQuestion.correct_index;
            const isWrongSelected = isAnswered && isSelected && !isCorrect;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  isSelected && !isAnswered && styles.optionSelected,
                  isCorrectOption && styles.optionCorrect,
                  isWrongSelected && styles.optionWrong,
                ]}
                onPress={() => handleSelectAnswer(index, option)}
                disabled={isAnswered}
              >
                <View style={styles.optionContent}>
                  <TouchableOpacity onPress={() => speak(option)} style={styles.speakerButton}>
                    <Volume2 size={20} color="#58CC02" />
                  </TouchableOpacity>
                  <Text style={styles.optionText}>{option}</Text>
                </View>
                
                {isCorrectOption && <CheckCircle2 size={24} color="#22c55e" />}
                {isWrongSelected && <XCircle size={24} color="#ef4444" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {!isAnswered ? (
          <TouchableOpacity
            style={[styles.checkButton, selectedAnswer === null && styles.checkButtonDisabled]}
            onPress={handleCheckAnswer}
            disabled={selectedAnswer === null || isChecking}
          >
            {isChecking ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkButtonText}>Kiểm tra</Text>}
          </TouchableOpacity>
        ) : (
          <View style={[styles.resultContainer, isCorrect ? styles.resultCorrect : styles.resultWrong]}>
            <View style={styles.resultHeader}>
              {isCorrect ? <Sparkles size={24} color="#16a34a" /> : <XCircle size={24} color="#dc2626" />}
              <Text style={[styles.resultTitle, isCorrect ? { color: '#16a34a' } : { color: '#dc2626' }]}>
                {isCorrect ? 'Chính xác!' : 'Sai rồi!'}
              </Text>
            </View>
            {!isCorrect && (
              <Text style={styles.resultSubtitle}>
                Đáp án đúng: <Text style={{ fontWeight: 'bold' }}>{currentQuestion.options[currentQuestion.correct_index]}</Text>
              </Text>
            )}
            <TouchableOpacity
              style={[styles.continueButton, isCorrect ? styles.continueButtonCorrect : styles.continueButtonWrong]}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Tiếp tục</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  errorSubtitle: { fontSize: 16, color: '#777', textAlign: 'center', marginBottom: 24 },
  exitButton: { backgroundColor: '#58CC02', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  exitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'android' ? 40 : 16 },
  closeButton: { padding: 8 },
  progressContainer: { flex: 1, marginHorizontal: 16 },
  progressBarBg: { height: 16, backgroundColor: '#e5e5e5', borderRadius: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#58CC02', borderRadius: 8 },
  heartsContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heartsText: { fontSize: 18, fontWeight: 'bold', color: '#FF4B4B' },
  content: { flex: 1, padding: 24 },
  questionIndexText: { fontSize: 14, fontWeight: 'bold', color: '#a1a1aa', textTransform: 'uppercase', marginBottom: 8 },
  questionText: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 32 },
  optionsContainer: { gap: 12 },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  optionSelected: { borderColor: '#58CC02', backgroundColor: 'rgba(88, 204, 2, 0.1)' },
  optionCorrect: { borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)' },
  optionWrong: { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  optionContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  speakerButton: { marginRight: 12, padding: 8, backgroundColor: 'rgba(88, 204, 2, 0.1)', borderRadius: 8 },
  optionText: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  footer: { padding: 24, borderTopWidth: 2, borderTopColor: '#e5e5e5' },
  checkButton: {
    backgroundColor: '#58CC02',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderColor: '#46A302',
  },
  checkButtonDisabled: { backgroundColor: '#e5e5e5', borderColor: '#d4d4d8' },
  checkButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase' },
  resultContainer: { padding: 16, borderRadius: 16, borderWidth: 2 },
  resultCorrect: { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e' },
  resultWrong: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  resultTitle: { fontSize: 20, fontWeight: 'bold' },
  resultSubtitle: { fontSize: 16, color: '#333', marginBottom: 16 },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderBottomWidth: 4,
    marginTop: 12,
  },
  continueButtonCorrect: { backgroundColor: '#58CC02', borderColor: '#46A302' },
  continueButtonWrong: { backgroundColor: '#ef4444', borderColor: '#b91c1c' },
  continueButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase' },
});
