import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, SafeAreaView, ScrollView } from 'react-native';
import { Zap, Trophy, Users, Sparkles } from 'lucide-react-native';

const features = [
  { icon: Zap, title: "Học nhanh chóng", description: "Các bài học ngắn gọn, hiệu quả chỉ trong 5 phút mỗi ngày" },
  { icon: Trophy, title: "Gamification", description: "Kiếm XP, lên cấp và cạnh tranh với bạn bè trên bảng xếp hạng" },
  { icon: Users, title: "Cộng đồng", description: "Tham gia hàng triệu người học trên toàn thế giới" },
  { icon: Sparkles, title: "Miễn phí", description: "Học ngôn ngữ hoàn toàn miễn phí, mọi lúc mọi nơi" },
];

export default function LandingScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Hero Section */}
        <View style={styles.hero}>
          <Image
            source={require('../assets/monster_green_down.png')}
            style={styles.mascot}
            resizeMode="contain"
          />
          <Text style={styles.title}>Learn English</Text>
          <Text style={styles.subtitle}>
            Học ngôn ngữ miễn phí.{'\n'}Vui vẻ. Hiệu quả.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.primaryButtonText}>Bắt đầu học ngay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.secondaryButtonText}>Tôi đã có tài khoản</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Tại sao chọn Learn English?</Text>
          
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  <feature.icon size={24} color="#58CC02" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 40 },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
    backgroundColor: '#58CC02',
  },
  mascot: {
    width: 220,
    height: 220,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 28,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e5e5',
    borderBottomWidth: 4,
  },
  primaryButtonText: {
    color: '#58CC02',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  featuresSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    backgroundColor: '#fff',
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(88, 204, 2, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#777',
    lineHeight: 20,
  },
});
