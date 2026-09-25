import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

type View = 'menu' | 'profile' | 'password';

export default function SettingsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>('menu');
  const [isEditing, setIsEditing] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const isGoogleUser =
    user?.app_metadata?.provider === 'google' ||
    (user?.app_metadata?.providers ?? []).includes('google');

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setDisplayName(data.display_name || '');
            setUsername(data.username || '');
            setAvatarUrl(data.avatar_url || '');
          }
        });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName, username, avatar_url: avatarUrl })
        .eq('user_id', user.id);
      if (error) throw error;
      Alert.alert('Thành công', 'Thông tin đã được lưu.');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật hồ sơ');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!oldPassword) { Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu cũ.'); return; }
    if (password.length < 6) { Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự.'); return; }
    if (password !== confirmPassword) { Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.'); return; }

    setIsSavingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: oldPassword,
      });
      if (signInError) throw new Error('Mật khẩu cũ không chính xác.');

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      Alert.alert('Thành công', 'Mật khẩu đã được thay đổi.');
      setOldPassword(''); setPassword(''); setConfirmPassword('');
      setView('menu');
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể đổi mật khẩu');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const FieldRow = ({ label, value, placeholder, onChangeText, secureTextEntry = false }: {
    label: string; value: string; placeholder?: string;
    onChangeText: (v: string) => void; secureTextEntry?: boolean;
  }) => (
    <View className="mb-4">
      <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</Text>
      {isEditing ? (
        <TextInput
          className="bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 text-base focus:border-[#1CB0F6]"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
        />
      ) : (
        <View className="px-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white">
          <Text className={`text-base ${value ? 'text-gray-800 font-medium' : 'text-gray-400 italic'}`}>
            {value || 'Chưa đặt'}
          </Text>
        </View>
      )}
    </View>
  );

  // ─── Menu ────────────────────────────────────────────────────────
  if (view === 'menu') {
    return (
      <SafeAreaView className="flex-1 bg-[#f0f2f5]">
        <View className="flex-row items-center p-4 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()} className="p-2 mr-3">
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text className="text-2xl font-black text-gray-800">Cài đặt</Text>
        </View>

        <ScrollView className="flex-1 p-4">
          <Text className="text-sm text-gray-400 font-semibold uppercase tracking-widest mb-4 px-1">
            Tài khoản
          </Text>

          <TouchableOpacity
            className="bg-white rounded-2xl p-4 mb-3 flex-row items-center border border-gray-100 shadow-sm shadow-black/5 active:opacity-70"
            onPress={() => { setView('profile'); setIsEditing(false); }}
          >
            <View className="size-12 rounded-full bg-blue-50 items-center justify-center mr-4">
              <Ionicons name="person" size={24} color="#1CB0F6" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-base text-gray-800">Thông tin cá nhân</Text>
              <Text className="text-sm text-gray-500">Xem và chỉnh sửa thông tin hồ sơ</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white rounded-2xl p-4 mb-3 flex-row items-center border border-gray-100 shadow-sm shadow-black/5 active:opacity-70"
            onPress={() => setView('password')}
          >
            <View className="size-12 rounded-full bg-red-50 items-center justify-center mr-4">
              <Ionicons name="lock-closed" size={24} color="#ef4444" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-base text-gray-800">Đổi mật khẩu</Text>
              <Text className="text-sm text-gray-500">Cập nhật mật khẩu đăng nhập</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Profile View ─────────────────────────────────────────────
  if (view === 'profile') {
    return (
      <SafeAreaView className="flex-1 bg-[#f0f2f5]">
        <View className="flex-row items-center justify-between p-4 bg-white border-b border-gray-200">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => { setView('menu'); setIsEditing(false); }}
              className="p-2 mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text className="text-xl font-black text-gray-800">Thông tin cá nhân</Text>
          </View>
          {!isEditing ? (
            <TouchableOpacity
              className="size-10 rounded-full bg-blue-50 items-center justify-center border-2 border-blue-100"
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={18} color="#1CB0F6" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="flex-row items-center bg-gray-100 px-3 py-2 rounded-xl"
              onPress={() => setIsEditing(false)}
            >
              <Ionicons name="close" size={16} color="#6b7280" />
              <Text className="text-gray-500 font-bold text-sm ml-1.5">Hủy</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Avatar */}
          <View className="items-center mb-6">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="size-24 rounded-full border-4 border-blue-100"
                style={{ width: 96, height: 96, borderRadius: 48 }}
              />
            ) : (
              <View className="size-24 rounded-full bg-blue-50 border-4 border-blue-100 items-center justify-center"
                style={{ width: 96, height: 96, borderRadius: 48 }}>
                <Ionicons name="person" size={44} color="#1CB0F6" />
              </View>
            )}
          </View>

          <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm shadow-black/5">
            {/* Email always read-only */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Email</Text>
              <View className="px-4 py-3.5 rounded-xl bg-gray-50 border-2 border-gray-200">
                <Text className="text-base text-gray-500 font-medium">{user?.email}</Text>
              </View>
            </View>

            <FieldRow label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} placeholder="VD: Người học mới" />
            <FieldRow label="Tên đăng nhập" value={username} onChangeText={setUsername} placeholder="VD: new_learner_123" />

            {isEditing && (
              <View className="mb-4">
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">URL Ảnh đại diện</Text>
                <TextInput
                  className="bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 text-base"
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                  placeholder="https://example.com/avatar.png"
                  autoCapitalize="none"
                />
              </View>
            )}

            {isEditing && (
              <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                className="flex-1 bg-[#58CC02] py-4 rounded-xl items-center flex-row justify-center border-b-4 border-[#46A302] active:opacity-80"
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="save" size={20} color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text className="text-white font-black text-base">Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-gray-100 py-4 rounded-xl items-center justify-center border-b-4 border-gray-200 active:opacity-80"
                onPress={() => setIsEditing(false)}
                disabled={isSavingProfile}
              >
                <Text className="text-gray-600 font-black text-base">Hủy</Text>
              </TouchableOpacity>
            </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Password View ────────────────────────────────────────────
  if (view === 'password') {
    return (
      <SafeAreaView className="flex-1 bg-[#f0f2f5]">
        <View className="flex-row items-center p-4 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => setView('menu')} className="p-2 mr-3">
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text className="text-xl font-black text-gray-800">Đổi mật khẩu</Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {isGoogleUser ? (
            <View className="bg-white rounded-2xl p-8 items-center border border-gray-100 shadow-sm shadow-black/5 mt-4">
              <View className="size-20 rounded-full bg-blue-50 items-center justify-center mb-5"
                style={{ width: 80, height: 80, borderRadius: 40 }}>
                <Ionicons name="logo-google" size={40} color="#4285F4" />
              </View>
              <Text className="text-xl font-black text-gray-800 mb-3 text-center">
                Đăng nhập bằng Google
              </Text>
              <Text className="text-sm text-gray-500 text-center leading-6 mb-5">
                Tài khoản của bạn đang được đăng nhập thông qua Google. Bạn không cần và không thể đặt mật khẩu riêng cho tài khoản này.
              </Text>
              <View className="flex-row items-center bg-blue-50 px-4 py-3 rounded-xl">
                <Ionicons name="information-circle" size={18} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text className="text-blue-600 text-sm font-semibold flex-1">
                  Quản lý mật khẩu tại tài khoản Google của bạn
                </Text>
              </View>
            </View>
          ) : (
            <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm shadow-black/5 mt-4">
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Mật khẩu hiện tại</Text>
              <TextInput
                className="bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 text-base mb-5"
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Nhập mật khẩu hiện tại"
                secureTextEntry
              />

              <View className="h-[1px] bg-gray-100 mb-5" />

              <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Mật khẩu mới</Text>
              <TextInput
                className="bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 text-base mb-4"
                value={password}
                onChangeText={setPassword}
                placeholder="Tối thiểu 6 ký tự"
                secureTextEntry
              />

              <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Xác nhận mật khẩu mới</Text>
              <TextInput
                className="bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 text-base mb-1"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Nhập lại mật khẩu mới"
                secureTextEntry
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text className="text-red-500 text-xs font-semibold mb-3">Mật khẩu không khớp</Text>
              )}

              <TouchableOpacity
                className={`py-4 rounded-xl items-center flex-row justify-center mt-4 border-b-4 ${
                  (!oldPassword || !password || !confirmPassword)
                    ? 'bg-red-300 border-red-400'
                    : 'bg-[#ff4b4b] border-[#c53030] active:opacity-80'
                }`}
                onPress={handleSavePassword}
                disabled={isSavingPassword || !oldPassword || !password || !confirmPassword}
              >
                {isSavingPassword ? (
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="shield-checkmark" size={22} color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text className="text-white font-black text-lg uppercase tracking-wide">Cập nhật mật khẩu</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}
