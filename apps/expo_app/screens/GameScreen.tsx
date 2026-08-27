import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Gamepad2, Zap, Trophy, Target, Lock } from 'lucide-react-native';

const games = [
  {
    id: "word-defense",
    title: "Thủ thành từ vựng",
    description: "Ngăn chặn quái vật bằng cách dịch từ chính xác",
    icon: Zap,
    color: "#3b82f6", // blue
    bgColor: "rgba(59, 130, 246, 0.1)",
    status: "active",
  },
  {
    id: "pronunciation-challenge",
    title: "Thử thách phát âm",
    description: "Luyện phát âm chuẩn với AI",
    icon: Target,
    color: "#a855f7", // purple
    bgColor: "rgba(168, 85, 247, 0.1)",
    status: "coming-soon",
  },
  {
    id: "speed-quiz",
    title: "Quiz tốc độ",
    description: "Trả lời nhanh để ghi điểm cao",
    icon: Trophy,
    color: "#f97316", // orange
    bgColor: "rgba(249, 115, 22, 0.1)",
    status: "coming-soon",
  },
  {
    id: "word-runner",
    title: "Word Runner",
    description: "Chạy và nhảy để thu thập từ vựng",
    icon: Gamepad2,
    color: "#22c55e", // green
    bgColor: "rgba(34, 197, 94, 0.1)",
    status: "coming-soon", // Set as coming soon on Mobile since it's not implemented yet
  },
  {
    id: "listening-game",
    title: "Nghe hiểu",
    description: "Luyện nghe và chọn đáp án đúng",
    icon: Gamepad2,
    color: "#10b981", // emerald
    bgColor: "rgba(16, 185, 129, 0.1)",
    status: "coming-soon",
  },
];

export default function GameScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrapper}>
            <Gamepad2 size={32} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Trò chơi học tập</Text>
          <Text style={styles.headerSubtitle}>Học tiếng Anh vui vẻ qua các trò chơi thú vị</Text>
        </View>

        {/* Games List */}
        <View style={styles.gamesGrid}>
          {games.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={[
                styles.gameCard,
                game.status === 'coming-soon' && styles.gameCardDisabled
              ]}
              disabled={game.status === 'coming-soon'}
              onPress={() => {
                if (game.id === 'word-defense') {
                  navigation.navigate('WordDefense');
                }
              }}
            >
              <View style={[styles.cardBackground, { backgroundColor: game.bgColor }]} />
              
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: game.color }]}>
                    <game.icon size={24} color="#fff" />
                  </View>
                </View>

                <View style={styles.cardInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.gameTitle}>{game.title}</Text>
                    {game.status === 'coming-soon' && <Lock size={16} color="#a1a1aa" />}
                  </View>
                  <Text style={styles.gameDescription}>{game.description}</Text>
                </View>

                <View style={[
                  styles.playButton, 
                  game.status === 'coming-soon' ? styles.playButtonDisabled : styles.playButtonActive
                ]}>
                  <Text style={[
                    styles.playButtonText,
                    game.status === 'coming-soon' ? styles.playButtonTextDisabled : styles.playButtonTextActive
                  ]}>
                    {game.status === 'coming-soon' ? 'Sắp ra mắt' : 'Chơi ngay'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <Gamepad2 size={24} color="#fff" />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Đang phát triển</Text>
            <Text style={styles.infoDesc}>Các trò chơi học tập đang được phát triển và sẽ sớm ra mắt. Hãy quay lại sau để trải nghiệm nhé! 🎮</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 12 },
  headerIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#58CC02',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#58CC02',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: '#777', textAlign: 'center', paddingHorizontal: 20 },
  
  gamesGrid: { gap: 16, marginBottom: 24 },
  gameCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  gameCardDisabled: { opacity: 0.75 },
  cardBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cardContent: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  gameTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  gameDescription: { fontSize: 14, color: '#666' },
  
  playButton: { width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  playButtonActive: { backgroundColor: '#3b82f6' },
  playButtonDisabled: { backgroundColor: '#f4f4f5' },
  playButtonText: { fontSize: 16, fontWeight: 'bold' },
  playButtonTextActive: { color: '#fff' },
  playButtonTextDisabled: { color: '#a1a1aa' },
  
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(88, 204, 2, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(88, 204, 2, 0.3)',
    gap: 16,
  },
  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#58CC02',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextContainer: { flex: 1 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  infoDesc: { fontSize: 14, color: '#666', lineHeight: 20 },
});
