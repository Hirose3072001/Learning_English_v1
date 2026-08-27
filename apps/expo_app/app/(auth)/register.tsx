import React from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const handleRegister = () => {
    // Navigate to the main app tabs after registration
    router.replace('/(tabs)/learn');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 px-6 justify-center"
      >
        <TouchableOpacity 
          className="absolute top-12 left-6 z-10"
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color="#a1a1aa" />
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-gray-800 text-center mb-8">
          Tạo tài khoản mới
        </Text>

        <View className="gap-4 mb-6">
          <TextInput
            placeholder="Tên của bạn"
            className="w-full bg-gray-100 rounded-2xl px-4 py-4 text-lg border-2 border-transparent focus:border-primary focus:bg-blue-50"
          />
          <TextInput
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            className="w-full bg-gray-100 rounded-2xl px-4 py-4 text-lg border-2 border-transparent focus:border-primary focus:bg-blue-50"
          />
          <TextInput
            placeholder="Mật khẩu"
            secureTextEntry
            className="w-full bg-gray-100 rounded-2xl px-4 py-4 text-lg border-2 border-transparent focus:border-primary focus:bg-blue-50"
          />
        </View>

        <TouchableOpacity 
          className="bg-primary py-4 rounded-2xl w-full items-center border-b-4 border-[#46A302] active:opacity-80 mb-6"
          onPress={handleRegister}
        >
          <Text className="text-white text-lg font-bold uppercase">Tạo tài khoản</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center items-center gap-2">
          <Text className="text-gray-500 font-semibold text-lg">Đã có tài khoản?</Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-secondary font-bold text-lg uppercase">Đăng nhập</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
