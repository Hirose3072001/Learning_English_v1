import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../supabase/client';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Đăng nhập thất bại', error.message);
    } else {
      // Navigation state is handled by App.tsx (Auth listener)
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#a1a1aa" />
        </TouchableOpacity>

        <Text style={styles.heading}>Đăng nhập</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>hoặc</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity 
          style={styles.googleButton} 
          onPress={async () => {
            setLoading(true);
            try {
              const redirectUrl = Linking.createURL('/auth/callback');
              const { data, error } = await supabase.auth.signInWithOAuth({ 
                provider: 'google',
                options: {
                  redirectTo: redirectUrl,
                  skipBrowserRedirect: true,
                }
              });
              if (error) throw error;
              if (data?.url) {
                const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                if (res.type === 'success' && res.url) {
                  const hash = res.url.split('#')[1];
                  if (hash) {
                    const params = hash.split('&').reduce((acc: any, item) => {
                      const [key, value] = item.split('=');
                      acc[key] = decodeURIComponent(value);
                      return acc;
                    }, {});
                    if (params.access_token && params.refresh_token) {
                      await supabase.auth.setSession({
                        access_token: params.access_token,
                        refresh_token: params.refresh_token,
                      });
                    }
                  }
                }
              }
            } catch (e: any) {
              Alert.alert('Lỗi', e.message);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={24} color="#db4437" style={styles.googleIcon} />
          <Text style={styles.googleButtonText}>Đăng nhập với Google</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>ĐĂNG KÝ</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 50, left: 24, zIndex: 10 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 32 },
  form: { gap: 16, marginBottom: 24 },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  primaryButton: {
    backgroundColor: '#58CC02',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderColor: '#46A302',
    marginBottom: 24,
  },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e5e5' },
  dividerText: { marginHorizontal: 12, color: '#a1a1aa', fontWeight: 'bold' },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    marginBottom: 24,
  },
  googleIcon: { marginRight: 12 },
  googleButtonText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: '#777', fontSize: 16, fontWeight: '600' },
  footerLink: { color: '#1CB0F6', fontSize: 16, fontWeight: 'bold' },
});
