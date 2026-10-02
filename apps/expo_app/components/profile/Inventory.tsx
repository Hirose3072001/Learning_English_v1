import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { Shield, Heart } from 'lucide-react-native';

interface InventoryItem {
  id: string;
  shop_item_id: string;
  quantity: number;
  shop_items: {
    name: string;
    description: string;
    type: string;
    effect_value: number;
    icon: string;
  };
}

interface Profile {
  hearts: number;
  max_hearts: number;
}

export const Inventory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [usingId, setUsingId] = useState<string | null>(null);

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['user-inventory-details', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_shop_items')
        .select('id, shop_item_id, quantity, shop_items!inner(name, description, type, effect_value, icon)')
        .eq('user_id', user.id)
        .gt('quantity', 0);
      if (error) throw error;
      return (data || []).filter((item: any) => item.shop_items != null) as InventoryItem[];
    },
    enabled: !!user?.id,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('hearts, max_hearts')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
  });

  const handleUseItem = async (inventoryId: string, item: InventoryItem['shop_items']) => {
    if (!user?.id || !profile) return;

    setUsingId(inventoryId);
    try {
      if (item.type === 'heart_restore') {
        const newHearts = Math.min(profile.hearts + item.effect_value, profile.max_hearts);

        const { error: heartsError } = await supabase
          .from('profiles')
          .update({ hearts: newHearts })
          .eq('user_id', user.id);

        if (heartsError) throw heartsError;

        const currentItem = inventory?.find((inv) => inv.id === inventoryId);
        if (currentItem) {
          if (currentItem.quantity > 1) {
            const { error: updateError } = await supabase
              .from('user_shop_items')
              .update({ quantity: currentItem.quantity - 1, used_at: new Date().toISOString() })
              .eq('id', inventoryId);
            if (updateError) throw updateError;
          } else {
            const { error: deleteError } = await supabase
              .from('user_shop_items')
              .delete()
              .eq('id', inventoryId);
            if (deleteError) throw deleteError;
          }
        }
        Alert.alert('Thành công', `+${item.effect_value} ❤️ hồi phục! Tim hiện có: ${newHearts}/${profile.max_hearts}`);
      } else if (item.type === 'streak_protect') {
        const today = new Date();
        const expiresAt = new Date(today.getTime() + item.effect_value * 24 * 60 * 60 * 1000);

        const { error: protectError } = await supabase
          .from('streak_protections')
          .insert({
            user_id: user.id,
            protection_days: item.effect_value,
            expires_at: expiresAt.toISOString(),
          });

        if (protectError) throw protectError;

        const currentItem = inventory?.find((inv) => inv.id === inventoryId);
        if (currentItem) {
          if (currentItem.quantity > 1) {
            const { error: updateError } = await supabase
              .from('user_shop_items')
              .update({ quantity: currentItem.quantity - 1, used_at: new Date().toISOString() })
              .eq('id', inventoryId);
            if (updateError) throw updateError;
          } else {
            const { error: deleteError } = await supabase
              .from('user_shop_items')
              .delete()
              .eq('id', inventoryId);
            if (deleteError) throw deleteError;
          }
        }
        Alert.alert('Thành công', `Kích hoạt bảo vệ streak ${item.effect_value} ngày!`);
      }

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-inventory-details'] });
    } catch (error) {
      console.error('Error using item:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi sử dụng item');
    } finally {
      setUsingId(null);
    }
  };

  const isLoading = inventoryLoading || profileLoading;

  if (isLoading) {
    return (
      <View style={[styles.center, { marginTop: 40 }]}>
        <ActivityIndicator size="large" color="#58CC02" />
      </View>
    );
  }

  if (!inventory || inventory.length === 0) {
    return (
      <View style={[styles.center, { marginTop: 40 }]}>
        <View style={styles.emptyBadge}>
          <Text style={styles.emptyText}>Không có item</Text>
        </View>
        <Text style={styles.emptyDesc}>Bạn chưa mua item nào. Hãy ghé cửa hàng!</Text>
      </View>
    );
  }

  const heartItems = inventory.filter((inv) => inv.shop_items.type === 'heart_restore');
  const protectItems = inventory.filter((inv) => inv.shop_items.type === 'streak_protect');

  return (
    <View style={styles.container}>
      {profile && profile.hearts < profile.max_hearts && heartItems.length > 0 && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Tim hiện có: {profile.hearts}/{profile.max_hearts}
          </Text>
        </View>
      )}

      {heartItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Heart size={24} color="#ef4444" />
            <Text style={styles.sectionTitle}>Hồi phục Tim</Text>
          </View>
          {heartItems.map((invItem) => (
            <View key={invItem.id} style={[styles.card, styles.cardRed]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{invItem.shop_items.name}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>x{invItem.quantity}</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>Hồi phục +{invItem.shop_items.effect_value} trái tim</Text>
              <Text style={styles.autoUseText}>⚠️ Tự động kích hoạt khi hết mạng trong bài học</Text>
              <View style={styles.autoUseButton}>
                <Text style={styles.autoUseButtonText}>Tự động</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {protectItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={24} color="#58CC02" />
            <Text style={styles.sectionTitle}>Bảo vệ Streak</Text>
          </View>
          {protectItems.map((invItem) => (
            <View key={invItem.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{invItem.shop_items.name}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>x{invItem.quantity}</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>Bảo vệ {invItem.shop_items.effect_value} ngày</Text>
              <TouchableOpacity
                style={styles.useButton}
                onPress={() => handleUseItem(invItem.id, invItem.shop_items)}
                disabled={usingId !== null}
              >
                {usingId === invItem.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.useButtonText}>Kích hoạt</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  emptyBadge: { backgroundColor: '#f4f4f5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e5e5' },
  emptyText: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  emptyDesc: { fontSize: 14, color: '#777' },
  warningBox: { backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#fee2e2' },
  warningText: { color: '#b91c1c', fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#e5e5e5', marginBottom: 12 },
  cardRed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  badge: { backgroundColor: '#f4f4f5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  cardDesc: { fontSize: 14, color: '#777', marginBottom: 12 },
  autoUseText: { fontSize: 12, color: '#ea580c', fontWeight: '500', marginBottom: 12 },
  useButton: { backgroundColor: '#58CC02', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  useButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  autoUseButton: { backgroundColor: 'transparent', paddingVertical: 8, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#fecaca', opacity: 0.7 },
  autoUseButtonText: { fontSize: 14, fontWeight: 'bold', color: '#ef4444' },
});
