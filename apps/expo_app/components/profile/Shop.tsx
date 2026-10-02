import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { Shield, Heart, Gem } from 'lucide-react-native';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: string;
  effect_value: number;
  cost_gems: number;
  icon: string;
}

interface UserShopItem {
  id: string;
  shop_item_id: string;
  quantity: number;
}

export const Shop = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['shop-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_active', true)
        .order('cost_gems');
      if (error) throw error;
      return data as ShopItem[];
    },
    staleTime: 1000 * 60 * 60,
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['user-inventory', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_shop_items')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as UserShopItem[];
    },
    enabled: !!user?.id,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('gems')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleBuy = async (item: ShopItem) => {
    if (!user?.id) return;
    if (!profile || (profile.gems || 0) < item.cost_gems) {
      Alert.alert('Thất bại', 'Không đủ gem để mua item này');
      return;
    }

    setBuyingId(item.id);
    try {
      const { error: gemsError } = await supabase
        .from('profiles')
        .update({ gems: (profile.gems || 0) - item.cost_gems })
        .eq('user_id', user.id);

      if (gemsError) throw gemsError;

      const existingItem = inventory?.find((inv) => inv.shop_item_id === item.id);

      if (existingItem) {
        const { error: updateError } = await supabase
          .from('user_shop_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_shop_items')
          .insert({
            user_id: user.id,
            shop_item_id: item.id,
            quantity: 1,
          });
        if (insertError) throw insertError;
      }

      Alert.alert('Thành công', `Đã mua ${item.name}!`);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-inventory'] });
    } catch (error) {
      console.error('Error buying item:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi mua item');
    } finally {
      setBuyingId(null);
    }
  };

  const isLoading = itemsLoading || inventoryLoading || profileLoading;

  if (isLoading) {
    return (
      <View style={[styles.center, { marginTop: 40 }]}>
        <ActivityIndicator size="large" color="#58CC02" />
      </View>
    );
  }

  const streakProtectItems = items?.filter((item) => item.type === 'streak_protect') || [];
  const heartItems = items?.filter((item) => item.type === 'heart_restore') || [];

  const getItemQuantity = (itemId: string) => {
    return inventory?.find((inv) => inv.shop_item_id === itemId)?.quantity || 0;
  };

  const renderItem = (item: ShopItem) => {
    const quantity = getItemQuantity(item.id);
    const canAfford = (profile?.gems || 0) >= item.cost_gems;
    const isBuying = buyingId === item.id;

    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {quantity > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>x{quantity}</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardDesc}>{item.description}</Text>
        <TouchableOpacity
          style={[styles.buyButton, !canAfford && styles.buyButtonDisabled]}
          onPress={() => handleBuy(item)}
          disabled={isBuying || !canAfford}
        >
          {isBuying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Gem size={16} color={canAfford ? '#fff' : '#a1a1aa'} />
              <Text style={[styles.buyButtonText, !canAfford && styles.buyButtonTextDisabled]}>
                {item.cost_gems}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.gemsHeader}>
        <Gem size={32} color="#06b6d4" />
        <View style={styles.gemsInfo}>
          <Text style={styles.gemsLabel}>Gem hiện có</Text>
          <Text style={styles.gemsValue}>{profile?.gems || 0}</Text>
        </View>
      </View>

      {streakProtectItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={24} color="#58CC02" />
            <Text style={styles.sectionTitle}>Thuốc giữ Streak</Text>
          </View>
          {streakProtectItems.map(renderItem)}
        </View>
      )}

      {heartItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Heart size={24} color="#ef4444" />
            <Text style={styles.sectionTitle}>Hồi phục</Text>
          </View>
          {heartItems.map(renderItem)}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  gemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    marginBottom: 24,
  },
  gemsInfo: { marginLeft: 16 },
  gemsLabel: { fontSize: 14, color: '#777' },
  gemsValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  badge: { backgroundColor: '#f4f4f5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  cardDesc: { fontSize: 14, color: '#777', marginBottom: 12 },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06b6d4',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  buyButtonDisabled: { backgroundColor: '#f4f4f5' },
  buyButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  buyButtonTextDisabled: { color: '#a1a1aa' },
});
