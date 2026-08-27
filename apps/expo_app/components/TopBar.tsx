import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Flame, Gem, Heart, BookOpen } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';

export default function TopBar() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const { data: profile } = useQuery({
    queryKey: ['profile', 'stats', userId],
    queryFn: async () => {
      if (!userId) return null;
      // In the real app, checkAndResetStreak would be called here via a backend function
      // For mobile UI parity, we just fetch the stats
      const { data, error } = await supabase
        .from('profiles')
        .select('streak_count, gems, hearts')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  return (
    <View style={styles.container}>
      {/* App Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.iconBox}>
          <BookOpen size={20} color="#fff" />
        </View>
        <Text style={styles.logoText}>Learn English</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Flame size={20} color="#FF9600" fill="#FF9600" />
          <Text style={[styles.statText, { color: '#FF9600' }]}>{profile?.streak_count ?? 0}</Text>
        </View>

        <View style={styles.statItem}>
          <Gem size={20} color="#1CB0F6" fill="#1CB0F6" />
          <Text style={[styles.statText, { color: '#1CB0F6' }]}>{profile?.gems ?? 100}</Text>
        </View>

        <View style={styles.statItem}>
          <Heart size={20} color="#FF4B4B" fill="#FF4B4B" />
          <Text style={[styles.statText, { color: '#FF4B4B' }]}>{profile?.hearts ?? 5}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e5e5',
    paddingTop: Platform.OS === 'android' ? 40 : 50, // Account for SafeArea
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#58CC02',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
