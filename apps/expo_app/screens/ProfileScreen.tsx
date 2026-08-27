import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Flame, Zap, Trophy, Calendar, LogOut, BookOpen, Target, Shield, Settings, Gem, Star, Award } from 'lucide-react-native';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function ProfileScreen({ navigation }: any) {
  const { user, loading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: dbAchievements = [], isLoading: achievementsLoading } = useQuery({
    queryKey: ['profile-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .order('condition_value', { ascending: true });
      if (error) return [];
      return data || [];
    },
  });

  const { data: leaderboardInfo = { rank: 0, total: 0 } } = useQuery({
    queryKey: ['profile-leaderboard-rank', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles_leaderboard').select('user_id, xp').order('xp', { ascending: false });
      if (error || !data) return { rank: 0, total: 0 };
      const idx = data.findIndex((item: any) => item.user_id === user?.id);
      return { rank: idx >= 0 ? idx + 1 : data.length + 1, total: data.length };
    },
  });

  const isLoading = authLoading || profileLoading || achievementsLoading;

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'book': return BookOpen;
      case 'zap': return Zap;
      case 'flame': return Flame;
      case 'target': return Target;
      case 'gem': return Gem;
      case 'star': return Star;
      case 'award': return Award;
      default: return Trophy;
    }
  };

  const getUserLeagueInfo = (xp: number, rank: number) => {
    if (rank === 1) return { name: "Vàng", color: "#f59e0b" };
    if (rank === 2) return { name: "Bạc", color: "#94a3b8" };
    if (rank === 3) return { name: "Đồng", color: "#b45309" };
    if (xp >= 3000) return { name: "Kim Cương", color: "#06b6d4" };
    if (xp >= 1500) return { name: "Bạch Kim", color: "#10b981" };
    if (xp >= 600) return { name: "Vàng", color: "#f59e0b" };
    if (xp >= 200) return { name: "Bạc", color: "#94a3b8" };
    return { name: "Đồng", color: "#b45309" };
  };

  const currentLeague = getUserLeagueInfo(profile?.xp || 0, leaderboardInfo.rank);

  const stats = [
    { icon: Zap, label: "Tổng XP", value: (profile?.xp || 0).toLocaleString(), color: "#58CC02" },
    { icon: Flame, label: "Streak", value: `${profile?.streak_count || 0} ngày`, color: "#f97316" },
    { icon: Trophy, label: "Hạng", value: currentLeague.name, color: currentLeague.color },
    { icon: Calendar, label: "Ngày học", value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString("vi-VN") : "-", color: "#8b5cf6" },
  ];

  const achievements = dbAchievements.length > 0 ? dbAchievements.map((item: any) => {
    let unlocked = false;
    if (item.condition_type === "xp") unlocked = (profile?.xp || 0) >= item.condition_value;
    else if (item.condition_type === "streak") unlocked = (profile?.streak_count || 0) >= item.condition_value;
    else if (item.condition_type === "lessons") unlocked = (profile?.xp || 0) > 0 && ((profile?.xp || 0) / 10 >= item.condition_value);
    return {
      icon: getAchievementIcon(item.icon),
      title: item.title,
      description: item.description,
      unlocked
    };
  }) : [
    { icon: BookOpen, title: "Người mới", description: "Hoàn thành bài học đầu tiên", unlocked: (profile?.xp || 0) > 0 },
    { icon: Flame, title: "Đốt cháy", description: "Duy trì 7 ngày streak", unlocked: (profile?.streak_count || 0) >= 7 },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#58CC02" />
      </View>
    );
  }

  const initial = user?.user_metadata?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";
  const xpInLevel = (profile?.xp || 0) % 1000;
  const level = Math.floor((profile?.xp || 0) / 1000) + 1;
  const progressPercent = (xpInLevel / 1000) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.username}>{user?.user_metadata?.username || "Người học"}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          <View style={styles.levelContainer}>
            <Text style={styles.levelText}>Cấp độ {level} <Text style={styles.levelDot}>•</Text> <Text style={styles.xpText}>{xpInLevel}/1000 XP</Text></Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <stat.icon size={32} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thành tựu</Text>
          <View style={styles.achievementsList}>
            {achievements.map((achievement: any, index: number) => (
              <View key={index} style={[styles.achievementCard, !achievement.unlocked && styles.achievementLocked]}>
                <View style={styles.achievementIconWrapper}>
                  <achievement.icon size={24} color={achievement.unlocked ? '#58CC02' : '#a1a1aa'} />
                </View>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementDesc}>{achievement.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsList}>
          <TouchableOpacity style={styles.actionBtn}>
            <Settings size={20} color="#333" />
            <Text style={styles.actionBtnText}>Cài đặt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnLogout]} onPress={handleLogout}>
            <LogOut size={20} color="#ef4444" />
            <Text style={[styles.actionBtnText, styles.actionBtnTextLogout]}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#58CC02',
    borderWidth: 4,
    borderColor: '#46A302',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  username: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 14, color: '#777', marginBottom: 16 },
  levelContainer: { width: '80%', alignItems: 'center' },
  levelText: { fontSize: 14, color: '#777', marginBottom: 8 },
  levelDot: { marginHorizontal: 4 },
  xpText: { fontWeight: 'bold', color: '#58CC02' },
  progressBarBg: { width: '100%', height: 12, backgroundColor: '#e5e5e5', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#58CC02', borderRadius: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 8 },
  statLabel: { fontSize: 14, color: '#777' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  achievementsList: { gap: 12 },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  achievementLocked: { opacity: 0.5 },
  achievementIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  achievementInfo: { flex: 1 },
  achievementTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  achievementDesc: { fontSize: 14, color: '#777' },
  actionsList: { gap: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    gap: 12,
  },
  actionBtnLogout: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  actionBtnText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  actionBtnTextLogout: { color: '#ef4444' },
});
