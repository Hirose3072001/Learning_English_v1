import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { Trophy, Crown, Users } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function LeaderboardScreen() {
  const { user, loading: authLoading } = useAuth();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['leaderboard-xp', user?.id],
    enabled: !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles_leaderboard')
        .select('id, user_id, username, display_name, avatar_url, xp')
        .order('xp', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const leaderboardData = (profiles || []).map((profile, index) => ({
    rank: index + 1,
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    xp: profile.xp,
    isCurrentUser: profile.user_id === user?.id,
  }));

  const getInitials = (userItem: any) => {
    const name = userItem.display_name || userItem.username || '?';
    return name.slice(0, 2).toUpperCase();
  };

  const getName = (userItem: any) => {
    return userItem.display_name || userItem.username || 'Người dùng';
  };

  if (isLoading || authLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#58CC02" />
        <Text style={{ marginTop: 12, color: '#777' }}>Đang tải bảng xếp hạng...</Text>
      </View>
    );
  }

  const topThree = leaderboardData.slice(0, 3);
  const restOfList = leaderboardData.slice(3);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrapper}>
            <Trophy size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Bảng xếp hạng</Text>
          <Text style={styles.headerSubtitle}>Xem thứ hạng của bạn và cạnh tranh với người học khác</Text>
        </View>

        {leaderboardData.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={64} color="#e5e5e5" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Chưa có dữ liệu</Text>
            <Text style={styles.emptySubtitle}>Hãy là người đầu tiên ghi tên lên bảng vàng!</Text>
          </View>
        ) : (
          <View>
            {/* Podium */}
            {topThree.length > 0 && (
              <View style={styles.podiumContainer}>
                {/* Second Place */}
                {topThree[1] && (
                  <View style={[styles.podiumItem, { marginTop: 40 }]}>
                    <View style={styles.avatarWrapper}>
                      {topThree[1].avatar_url ? (
                        <Image source={{ uri: topThree[1].avatar_url }} style={styles.avatarImageSilver} />
                      ) : (
                        <View style={styles.avatarFallbackSilver}>
                          <Text style={styles.avatarInitialsSilver}>{getInitials(topThree[1])}</Text>
                        </View>
                      )}
                      <View style={styles.rankBadgeSilver}>
                        <Text style={styles.rankBadgeText}>2</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {topThree[1].isCurrentUser ? 'Bạn' : getName(topThree[1])}
                    </Text>
                    <Text style={styles.podiumXp}>{topThree[1].xp.toLocaleString()}</Text>
                    <View style={[styles.podiumBase, styles.podiumBaseSilver]}>
                      <Text style={styles.podiumBaseText}>2</Text>
                    </View>
                  </View>
                )}

                {/* First Place */}
                {topThree[0] && (
                  <View style={[styles.podiumItem, { zIndex: 10 }]}>
                    <Crown size={32} color="#fbbf24" style={{ marginBottom: 8 }} />
                    <View style={styles.avatarWrapper}>
                      {topThree[0].avatar_url ? (
                        <Image source={{ uri: topThree[0].avatar_url }} style={styles.avatarImageGold} />
                      ) : (
                        <View style={styles.avatarFallbackGold}>
                          <Text style={styles.avatarInitialsGold}>{getInitials(topThree[0])}</Text>
                        </View>
                      )}
                      <View style={styles.rankBadgeGold}>
                        <Trophy size={16} color="#78350f" />
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {topThree[0].isCurrentUser ? 'Bạn' : getName(topThree[0])}
                    </Text>
                    <Text style={styles.podiumXpGold}>{topThree[0].xp.toLocaleString()}</Text>
                    <View style={[styles.podiumBase, styles.podiumBaseGold]}>
                      <Text style={styles.podiumBaseText}>1</Text>
                    </View>
                  </View>
                )}

                {/* Third Place */}
                {topThree[2] && (
                  <View style={[styles.podiumItem, { marginTop: 60 }]}>
                    <View style={styles.avatarWrapper}>
                      {topThree[2].avatar_url ? (
                        <Image source={{ uri: topThree[2].avatar_url }} style={styles.avatarImageBronze} />
                      ) : (
                        <View style={styles.avatarFallbackBronze}>
                          <Text style={styles.avatarInitialsBronze}>{getInitials(topThree[2])}</Text>
                        </View>
                      )}
                      <View style={styles.rankBadgeBronze}>
                        <Text style={styles.rankBadgeText}>3</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {topThree[2].isCurrentUser ? 'Bạn' : getName(topThree[2])}
                    </Text>
                    <Text style={styles.podiumXpBronze}>{topThree[2].xp.toLocaleString()}</Text>
                    <View style={[styles.podiumBase, styles.podiumBaseBronze]}>
                      <Text style={styles.podiumBaseText}>3</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Rest of the List */}
            <View style={styles.listContainer}>
              {restOfList.map((userItem) => (
                <View 
                  key={userItem.id} 
                  style={[
                    styles.listItem,
                    userItem.isCurrentUser && styles.listItemSelected
                  ]}
                >
                  <View style={[
                    styles.listRankBadge,
                    userItem.isCurrentUser && styles.listRankBadgeSelected
                  ]}>
                    <Text style={[
                      styles.listRankText,
                      userItem.isCurrentUser && styles.listRankTextSelected
                    ]}>{userItem.rank}</Text>
                  </View>
                  
                  {userItem.avatar_url ? (
                    <Image source={{ uri: userItem.avatar_url }} style={styles.listAvatar} />
                  ) : (
                    <View style={styles.listAvatarFallback}>
                      <Text style={styles.listAvatarInitials}>{getInitials(userItem)}</Text>
                    </View>
                  )}

                  <View style={styles.listInfo}>
                    <Text style={[
                      styles.listName,
                      userItem.isCurrentUser && styles.listNameSelected
                    ]} numberOfLines={1}>
                      {userItem.isCurrentUser ? 'Bạn' : getName(userItem)}
                    </Text>
                  </View>

                  <View style={styles.listXpContainer}>
                    <Text style={styles.listXp}>{userItem.xp.toLocaleString()}</Text>
                    <Text style={styles.listXpLabel}>XP</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
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
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: '#777', textAlign: 'center', paddingHorizontal: 20 },
  emptyState: { alignItems: 'center', marginTop: 40, padding: 24, backgroundColor: '#fff', borderRadius: 24, borderWidth: 2, borderColor: '#e5e5e5', borderStyle: 'dashed' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#777', textAlign: 'center' },
  
  // Podium Styles
  podiumContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 32, gap: 8 },
  podiumItem: { alignItems: 'center', width: '30%' },
  avatarWrapper: { position: 'relative', marginBottom: 12, alignItems: 'center' },
  
  avatarImageGold: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fbbf24' },
  avatarFallbackGold: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fbbf24', backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  avatarInitialsGold: { fontSize: 24, fontWeight: 'bold', color: '#78350f' },
  rankBadgeGold: { position: 'absolute', bottom: -10, width: 32, height: 32, borderRadius: 16, backgroundColor: '#fbbf24', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  
  avatarImageSilver: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: '#94a3b8' },
  avatarFallbackSilver: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: '#94a3b8', backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  avatarInitialsSilver: { fontSize: 20, fontWeight: 'bold', color: '#334155' },
  rankBadgeSilver: { position: 'absolute', bottom: -10, width: 28, height: 28, borderRadius: 14, backgroundColor: '#94a3b8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  
  avatarImageBronze: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: '#d97706' },
  avatarFallbackBronze: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: '#d97706', backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  avatarInitialsBronze: { fontSize: 16, fontWeight: 'bold', color: '#78350f' },
  rankBadgeBronze: { position: 'absolute', bottom: -10, width: 24, height: 24, borderRadius: 12, backgroundColor: '#d97706', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  
  rankBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  
  podiumName: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 2, textAlign: 'center', width: '100%' },
  podiumXp: { fontSize: 16, fontWeight: 'bold', color: '#64748b', marginBottom: 12 },
  podiumXpGold: { fontSize: 18, fontWeight: 'bold', color: '#d97706', marginBottom: 16 },
  podiumXpBronze: { fontSize: 14, fontWeight: 'bold', color: '#b45309', marginBottom: 12 },
  
  podiumBase: { width: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 16 },
  podiumBaseGold: { height: 100, backgroundColor: '#fbbf24' },
  podiumBaseSilver: { height: 70, backgroundColor: '#cbd5e1' },
  podiumBaseBronze: { height: 50, backgroundColor: '#f59e0b' },
  podiumBaseText: { fontSize: 32, fontWeight: 'bold', color: 'rgba(0,0,0,0.2)' },
  
  // List Styles
  listContainer: { gap: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  listItemSelected: { borderColor: '#58CC02', backgroundColor: 'rgba(88, 204, 2, 0.05)' },
  
  listRankBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  listRankBadgeSelected: { backgroundColor: '#58CC02' },
  listRankText: { fontSize: 16, fontWeight: 'bold', color: '#777' },
  listRankTextSelected: { color: '#fff' },
  
  listAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  listAvatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  listAvatarInitials: { fontSize: 16, fontWeight: 'bold', color: '#777' },
  
  listInfo: { flex: 1, marginRight: 12 },
  listName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  listNameSelected: { color: '#58CC02' },
  
  listXpContainer: { alignItems: 'flex-end' },
  listXp: { fontSize: 18, fontWeight: 'bold', color: '#58CC02' },
  listXpLabel: { fontSize: 12, fontWeight: 'bold', color: '#a1a1aa' },
});
