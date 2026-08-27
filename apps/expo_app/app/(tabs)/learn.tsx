import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function LearnScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b-2 border-gray-100">
        <View className="flex-row items-center gap-2">
          <Ionicons name="star" size={24} color="#FFC800" />
          <Text className="text-lg font-bold text-[#FFC800]">12</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text className="text-gray-400 font-bold">Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {/* Unit Header */}
        <View className="bg-primary rounded-2xl p-6 mb-8 border-b-4 border-[#46A302]">
          <Text className="text-white text-2xl font-black mb-2">Cửa 1</Text>
          <Text className="text-white/90 text-lg font-semibold">Chào hỏi cơ bản</Text>
        </View>

        {/* Path/Nodes (Mockup) */}
        <View className="items-center gap-6">
          <TouchableOpacity className="bg-primary w-20 h-20 rounded-full items-center justify-center border-b-8 border-[#46A302] active:opacity-80">
            <Ionicons name="star" size={36} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity className="bg-gray-200 w-16 h-16 rounded-full items-center justify-center border-b-8 border-gray-300 ml-12">
            <Ionicons name="lock-closed" size={24} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-200 w-16 h-16 rounded-full items-center justify-center border-b-8 border-gray-300 mr-12">
            <Ionicons name="lock-closed" size={24} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity className="bg-gray-200 w-16 h-16 rounded-full items-center justify-center border-b-8 border-gray-300">
            <Ionicons name="lock-closed" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
