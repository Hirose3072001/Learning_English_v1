import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Target, Clock, Gift, BookOpen, Zap, Flame, Gem, CheckCircle2 } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

const getIcon = (iconName: string | null) => {
  switch (iconName) {
    case 'book': return <BookOpen size={24} color="#58CC02" />;
    case 'zap': return <Zap size={24} color="#eab308" />;
    case 'flame': return <Flame size={24} color="#f97316" />;
    case 'target': return <Target size={24} color="#3b82f6" />;
    default: return <Target size={24} color="#a1a1aa" />;
  }
};

export default function QuestsScreen() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Get current period starts
  const { dailyStart, weeklyStart } = useMemo(() => {
    const now = new Date();
    const daily = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = now.getDay();
    const weekStart = new Date(daily);
    weekStart.setDate(daily.getDate() - dayOfWeek);
    return {
      dailyStart: daily.toISOString().split('T')[0],
      weeklyStart: weekStart.toISOString().split('T')[0],
    };
  }, []);

  const { data: quests, isLoading: questsLoading } = useQuery({
    queryKey: ['quests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quests').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('xp, streak_count, last_activity_date').eq('user_id', user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: lessonCounts, isLoading: lessonCountsLoading } = useQuery({
    queryKey: ['lesson-counts', user?.id, dailyStart, weeklyStart],
    queryFn: async () => {
      if (!user?.id) return { daily: 0, weekly: 0 };
      const { count: dailyCount, error: dailyError } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('completed_at', `${dailyStart}T00:00:00.000Z`);
      if (dailyError) throw dailyError;

      const { count: weeklyCount, error: weeklyError } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('completed_at', `${weeklyStart}T00:00:00.000Z`);
      if (weeklyError) throw weeklyError;

      return { daily: dailyCount || 0, weekly: weeklyCount || 0 };
    },
    enabled: !!user?.id,
  });

  const { data: userQuests, isLoading: userQuestsLoading } = useQuery({
    queryKey: ['user-quests', user?.id, dailyStart, weeklyStart],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('user_quests').select('*').eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isLoading = authLoading || questsLoading || profileLoading || lessonCountsLoading || userQuestsLoading;

  const getQuestProgress = (quest: any) => {
    const periodStart = quest.type === 'daily' ? dailyStart : weeklyStart;
    const userQuest = userQuests?.find((uq: any) => uq.quest_id === quest.id && uq.period_start === periodStart);

    if (userQuest?.claimed) {
      return { progress: quest.target_value, completed: true, claimed: true };
    }

    let progress = 0;
    switch (quest.target_type) {
      case 'lessons':
        progress = quest.type === 'daily' ? lessonCounts?.daily || 0 : lessonCounts?.weekly || 0;
        break;
      case 'xp':
        progress = profile?.xp || 0;
        break;
      case 'streak':
        const today = new Date().toISOString().split('T')[0];
        progress = profile?.last_activity_date === today ? 1 : 0;
        break;
    }

    const completed = progress >= quest.target_value;
    return {
      progress: Math.min(progress, quest.target_value),
      completed,
      claimed: userQuest?.claimed || false,
    };
  };

  const handleClaimReward = async (quest: any) => {
    if (!user?.id) return;
    const periodStart = quest.type === 'daily' ? dailyStart : weeklyStart;

    try {
      const { error: questError } = await supabase.from('user_quests').upsert({
        user_id: user.id,
        quest_id: quest.id,
        progress: quest.target_value,
        completed: true,
        claimed: true,
        period_start: periodStart,
      }, { onConflict: 'user_id,quest_id,period_start' });
      if (questError) throw questError;

      const today = new Date().toISOString().split('T')[0];
      const { data: profileData } = await supabase.from('profiles').select('gems').eq('user_id', user.id).single();

      const { error: gemsError } = await supabase.from('profiles')
        .update({ gems: (profileData?.gems || 0) + quest.reward_gems, last_activity_date: today })
        .eq('user_id', user.id);
      if (gemsError) throw gemsError;

      if (quest.reward_streak && quest.reward_streak > 0) {
        const { error: streakError } = await supabase.from('profiles')
          .update({ streak_count: (profile?.streak_count || 0) + quest.reward_streak })
          .eq('user_id', user.id);
        if (streakError) throw streakError;
      }

      queryClient.invalidateQueries({ queryKey: ['user-quests'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      Alert.alert('Nhận thưởng thành công!', `Bạn đã nhận được ${quest.reward_gems} Kim cương!`);
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Không thể nhận thưởng lúc này.');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#58CC02" />
      </View>
    );
  }

  const dailyQuests = quests?.filter((q: any) => q.type === 'daily') || [];
  const weeklyQuests = quests?.filter((q: any) => q.type === 'weekly') || [];

  const QuestCard = ({ quest, index }: { quest: any, index: number }) => {
    const { progress, completed, claimed } = getQuestProgress(quest);
    const progressPercent = (progress / quest.target_value) * 100;
    const [isClaiming, setIsClaiming] = useState(false);

    return (
      <View style={[styles.questCard, completed && !claimed && styles.questCardCompleted, claimed && styles.questCardClaimed]}>
        <View style={styles.questIconWrapper}>
          {getIcon(quest.icon)}
        </View>
        <View style={styles.questInfo}>
          <Text style={[styles.questTitle, claimed && styles.questTitleClaimed]}>{quest.title}</Text>
          <Text style={styles.questDescription}>{quest.description}</Text>
          
          <View style={styles.rewardsContainer}>
            {quest.reward_gems > 0 && (
              <View style={styles.rewardBadgeGem}>
                <Gem size={14} color="#38bdf8" />
                <Text style={styles.rewardTextGem}>+{quest.reward_gems}</Text>
              </View>
            )}
            {quest.reward_streak > 0 && (
              <View style={styles.rewardBadgeStreak}>
                <Flame size={14} color="#f97316" />
                <Text style={styles.rewardTextStreak}>+{quest.reward_streak}</Text>
              </View>
            )}
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>{progress}/{quest.target_value}</Text>
              <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {completed && !claimed && (
            <TouchableOpacity 
              style={styles.claimButton}
              disabled={isClaiming}
              onPress={async () => {
                setIsClaiming(true);
                await handleClaimReward(quest);
                setIsClaiming(false);
              }}
            >
              {isClaiming ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.claimButtonText}>Nhận thưởng</Text>}
            </TouchableOpacity>
          )}

          {claimed && (
            <View style={styles.claimedBadge}>
              <CheckCircle2 size={16} color="#a1a1aa" />
              <Text style={styles.claimedText}>Đã nhận</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrapper}>
            <Target size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Nhiệm vụ</Text>
          <Text style={styles.headerSubtitle}>Hoàn thành nhiệm vụ để nhận phần thưởng</Text>
        </View>

        {/* Daily Quests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color="#58CC02" />
            <Text style={styles.sectionTitle}>Nhiệm vụ hàng ngày</Text>
          </View>
          <View style={styles.questList}>
            {dailyQuests.map((quest: any, index: number) => (
              <QuestCard key={quest.id} quest={quest} index={index} />
            ))}
            {dailyQuests.length === 0 && (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>Chưa có nhiệm vụ hàng ngày</Text></View>
            )}
          </View>
        </View>

        {/* Weekly Quests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Gift size={20} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>Nhiệm vụ hàng tuần</Text>
          </View>
          <View style={styles.questList}>
            {weeklyQuests.map((quest: any, index: number) => (
              <QuestCard key={quest.id} quest={quest} index={index} />
            ))}
            {weeklyQuests.length === 0 && (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>Chưa có nhiệm vụ hàng tuần</Text></View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 12 },
  headerIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: '#777', textAlign: 'center', paddingHorizontal: 20 },
  
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  questList: { gap: 12 },
  questCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: '#e5e5e5' },
  questCardCompleted: { backgroundColor: 'rgba(88, 204, 2, 0.05)', borderColor: '#58CC02' },
  questCardClaimed: { opacity: 0.7 },
  
  questIconWrapper: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  questInfo: { flex: 1 },
  questTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  questTitleClaimed: { textDecorationLine: 'line-through', color: '#a1a1aa' },
  questDescription: { fontSize: 14, color: '#777', marginBottom: 12 },
  
  rewardsContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  rewardBadgeGem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rewardTextGem: { fontSize: 12, fontWeight: 'bold', color: '#0284c7' },
  rewardBadgeStreak: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(249, 115, 22, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rewardTextStreak: { fontSize: 12, fontWeight: 'bold', color: '#c2410c' },
  
  progressContainer: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 12, color: '#777', fontWeight: '500' },
  progressPercent: { fontSize: 12, color: '#333', fontWeight: 'bold' },
  progressBarBg: { height: 8, backgroundColor: '#e5e5e5', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#58CC02', borderRadius: 4 },
  
  claimButton: { backgroundColor: '#58CC02', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  claimButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  claimedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  claimedText: { fontSize: 12, color: '#a1a1aa', fontWeight: 'bold' },
  
  emptyCard: { padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#e5e5e5', borderStyle: 'dashed', alignItems: 'center' },
  emptyText: { color: '#a1a1aa', fontSize: 14 },
});
