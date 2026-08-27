import React from 'react';
import { Text, View, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Link } from 'expo-router';

export default function LandingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />
      <View className="flex-1 items-center justify-center px-6">
        <View className="mb-10 shadow-lg shadow-black/10">
          <Image 
            source={require('../assets/monster_green_down.png')} 
            className="w-[200px] h-[200px]"
            resizeMode="contain"
          />
        </View>

        <Text className="text-4xl font-black text-primary mb-3 text-center">
          Learn English
        </Text>
        <Text className="text-lg font-semibold text-gray-500 text-center mb-12 leading-7">
          Học ngôn ngữ miễn phí.{'\n'}Vui vẻ. Hiệu quả.
        </Text>

        <View className="w-full gap-4">
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity className="bg-primary py-4 rounded-2xl w-full items-center border-b-4 border-[#46A302] active:opacity-80">
              <Text className="text-white text-lg font-bold uppercase">Bắt đầu học ngay</Text>
            </TouchableOpacity>
          </Link>
          
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity className="bg-white py-4 rounded-2xl w-full items-center border-2 border-gray-200 border-b-4 active:opacity-80">
              <Text className="text-secondary text-lg font-bold uppercase">Tôi đã có tài khoản</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
