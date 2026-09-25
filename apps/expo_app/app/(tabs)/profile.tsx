import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, username, xp, streak_count')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-6 pb-2 border-b-2 border-gray-100 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-gray-800">Hồ sơ</Text>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={28} color="#1CB0F6" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-gray-200 rounded-full items-center justify-center mb-4">
            <Ionicons name="person" size={48} color="#9ca3af" />
          </View>
          <Text className="text-2xl font-bold text-gray-800">
            {profile?.display_name || user?.email?.split('@')[0] || 'Người học mới'}
          </Text>
          <Text className="text-gray-500 font-semibold text-lg">
            {profile?.username ? `@${profile.username}` : 'Đang học Tiếng Anh'}
          </Text>
        </View>

        <View className="border-t-2 border-gray-100 pt-6">
          <Text className="text-xl font-bold text-gray-800 mb-4">Thống kê</Text>
          <View className="flex-row flex-wrap justify-between gap-4">
            <View className="w-[47%] border-2 border-gray-200 rounded-2xl p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons name="flame" size={24} color="#FF9600" />
                <Text className="text-xl font-bold text-gray-800">{profile?.streak_count ?? 0}</Text>
              </View>
              <Text className="text-gray-500 font-semibold">Chuỗi ngày</Text>
            </View>
            <View className="w-[47%] border-2 border-gray-200 rounded-2xl p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons name="flash" size={24} color="#FFC800" />
                <Text className="text-xl font-bold text-gray-800">{profile?.xp ?? 0}</Text>
              </View>
              <Text className="text-gray-500 font-semibold">Tổng điểm KN</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
