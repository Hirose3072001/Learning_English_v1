import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, Lock, User, ChevronRight, X, KeyRound, Info, Plus } from 'lucide-react-native';
import { supabase } from '../supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

type ViewType = 'menu' | 'profile' | 'password';

export default function SettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewType>('menu');
  const [isEditing, setIsEditing] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const isGoogleUser = user?.app_metadata?.provider === 'google' || (user?.app_metadata?.providers ?? []).includes('google');

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
      Alert.alert('Lỗi', err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!oldPassword) return Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu cũ.');
    if (password.length < 6) return Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
    if (password !== confirmPassword) return Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');

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
      setOldPassword('');
      setPassword('');
      setConfirmPassword('');
      setView('menu');
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const renderHeader = (title: string, onBack: () => void) => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ArrowLeft size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (view === 'menu') {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader('Cài đặt', () => navigation.goBack())}
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>Quản lý tài khoản của bạn</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => { setView('profile'); setIsEditing(false); }}>
            <View style={styles.menuIconWrapper}>
              <User size={24} color="#58CC02" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuTitle}>Thông tin cá nhân</Text>
              <Text style={styles.menuDesc}>Xem và chỉnh sửa thông tin hồ sơ</Text>
            </View>
            <ChevronRight size={24} color="#a1a1aa" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderColor: '#fca5a5' }]} onPress={() => setView('password')}>
            <View style={[styles.menuIconWrapper, { backgroundColor: '#fef2f2' }]}>
              <Lock size={24} color="#ef4444" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuTitle}>Đổi mật khẩu</Text>
              <Text style={styles.menuDesc}>Cập nhật mật khẩu đăng nhập</Text>
            </View>
            <ChevronRight size={24} color="#ef4444" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (view === 'profile') {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader('Thông tin cá nhân', () => { setView('menu'); setIsEditing(false); })}
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.profileHeader}>
            <Text style={styles.subtitle}>{isEditing ? 'Chỉnh sửa thông tin của bạn' : 'Thông tin hồ sơ của bạn'}</Text>
            {!isEditing && (
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                <Text style={styles.editButtonText}>Chỉnh sửa</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.avatarContainer}>
            <View>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={40} color="#58CC02" />
                </View>
              )}
              
              {isEditing && (
                <TouchableOpacity 
                  style={styles.avatarUploadBtn}
                  onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
                >
                  <Plus size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <View style={styles.inputReadonly}>
              <Text style={styles.inputReadonlyText}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>TÊN HIỂN THỊ</Text>
            {isEditing ? (
              <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="VD: Người học mới" />
            ) : (
              <View style={styles.inputReadonlyWrapper}>
                <Text style={[styles.inputReadonlyTextVal, !displayName && styles.inputItalic]}>{displayName || 'Chưa đặt'}</Text>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>TÊN ĐĂNG NHẬP</Text>
            {isEditing ? (
              <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="VD: new_learner_123" />
            ) : (
              <View style={styles.inputReadonlyWrapper}>
                <Text style={[styles.inputReadonlyTextVal, !username && styles.inputItalic]}>{username || 'Chưa đặt'}</Text>
              </View>
            )}
          </View>



          {isEditing && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? <ActivityIndicator color="#fff" /> : <Save size={20} color="#fff" />}
                <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)} disabled={isSavingProfile}>
                <X size={20} color="#333" />
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (view === 'password') {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader('Đổi mật khẩu', () => setView('menu'))}
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>Cập nhật mật khẩu đăng nhập của bạn</Text>

          {isGoogleUser ? (
            <View style={styles.googleNotice}>
              <View style={styles.googleIconWrapper}>
                <Info size={32} color="#3b82f6" />
              </View>
              <Text style={styles.googleNoticeTitle}>Đăng nhập bằng Google</Text>
              <Text style={styles.googleNoticeDesc}>
                Tài khoản của bạn đang được đăng nhập thông qua Google. Bạn không cần và không thể đặt mật khẩu riêng cho tài khoản này.
              </Text>
            </View>
          ) : (
            <View style={styles.passwordForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>MẬT KHẨU HIỆN TẠI</Text>
                <TextInput style={styles.input} value={oldPassword} onChangeText={setOldPassword} secureTextEntry placeholder="Nhập mật khẩu hiện tại" />
              </View>

              <View style={styles.divider} />

              <View style={styles.formGroup}>
                <Text style={styles.label}>MẬT KHẨU MỚI</Text>
                <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Tối thiểu 6 ký tự" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>XÁC NHẬN MẬT KHẨU MỚI</Text>
                <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Nhập lại mật khẩu mới" />
                {confirmPassword && password !== confirmPassword && (
                  <Text style={styles.errorText}>Mật khẩu không khớp</Text>
                )}
              </View>

              <TouchableOpacity style={styles.savePasswordBtn} onPress={handleSavePassword} disabled={isSavingPassword || !oldPassword || !password || !confirmPassword}>
                {isSavingPassword ? <ActivityIndicator color="#fff" /> : <KeyRound size={20} color="#fff" />}
                <Text style={styles.savePasswordBtnText}>Cập nhật mật khẩu</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  content: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 16, color: '#777', marginBottom: 24 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#e5e5e5', marginBottom: 16 },
  menuIconWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  menuTextWrapper: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  menuDesc: { fontSize: 14, color: '#777' },
  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  editButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 2, borderColor: '#e5e5e5' },
  editButtonText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  avatarContainer: { alignItems: 'center', marginBottom: 32 },
  avatarImage: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: '#e5e5e5' },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#f4f4f5', borderWidth: 4, borderColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' },
  avatarUploadBtn: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#58CC02', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#777', marginBottom: 8 },
  inputReadonly: { backgroundColor: '#f4f4f5', padding: 12, borderRadius: 12 },
  inputReadonlyText: { fontSize: 16, color: '#555', fontWeight: '500' },
  inputReadonlyWrapper: { borderWidth: 2, borderColor: '#e5e5e5', padding: 12, borderRadius: 12, backgroundColor: '#fff' },
  inputReadonlyTextVal: { fontSize: 16, color: '#333', fontWeight: '500' },
  inputItalic: { fontStyle: 'italic', color: '#a1a1aa' },
  input: { borderWidth: 2, borderColor: '#e5e5e5', padding: 12, borderRadius: 12, fontSize: 16, backgroundColor: '#fff', color: '#333' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  saveBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#58CC02', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e5e5', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  cancelBtnText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
  googleNotice: { backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#bfdbfe', borderStyle: 'dashed', padding: 24, borderRadius: 16, alignItems: 'center' },
  googleIconWrapper: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  googleNoticeTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 8 },
  googleNoticeDesc: { fontSize: 14, color: '#3b82f6', textAlign: 'center', lineHeight: 20 },
  passwordForm: { marginTop: 8 },
  divider: { height: 1, backgroundColor: '#e5e5e5', marginVertical: 24 },
  errorText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  savePasswordBtn: { flexDirection: 'row', backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  savePasswordBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
