import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Heart, Gem, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

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

const getIcon = (iconName: string) => {
  switch (iconName) {
    case "shield": return Shield;
    case "heart": return Heart;
    default: return Gem;
  }
};

export const Shop = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [buyingId, setBuyingId] = useState<string | null>(null);

  // Fetch shop items
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["shop-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_items")
        .select("*")
        .eq("is_active", true)
        .order("cost_gems");
      if (error) throw error;
      return data as ShopItem[];
    },
    staleTime: 1000 * 60 * 60,
  });

  // Fetch user inventory
  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["user-inventory", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_shop_items")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as UserShopItem[];
    },
    enabled: !!user?.id,
  });

  // Fetch user profile for gems
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("gems")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleBuy = async (item: ShopItem) => {
    if (!user?.id) return;
    if (!profile || (profile.gems || 0) < item.cost_gems) {
      toast.error("Không đủ gem để mua item này");
      return;
    }

    setBuyingId(item.id);
    try {
      // Deduct gems
      const { error: gemsError } = await supabase
        .from("profiles")
        .update({ gems: (profile.gems || 0) - item.cost_gems })
        .eq("user_id", user.id);

      if (gemsError) throw gemsError;

      // Add or update inventory
      const existingItem = inventory?.find(
        (inv) => inv.shop_item_id === item.id
      );

      if (existingItem) {
        const { error: updateError } = await supabase
          .from("user_shop_items")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("user_shop_items")
          .insert({
            user_id: user.id,
            shop_item_id: item.id,
            quantity: 1,
          });
        if (insertError) throw insertError;
      }

      toast.success(`Đã mua ${item.name}!`);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-inventory"] });
    } catch (error) {
      console.error("Error buying item:", error);
      toast.error("Có lỗi xảy ra khi mua item");
    } finally {
      setBuyingId(null);
    }
  };

  const isLoading = itemsLoading || inventoryLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const streakProtectItems = items?.filter((item) => item.type === "streak_protect") || [];
  const heartItems = items?.filter((item) => item.type === "heart_restore") || [];

  const getItemQuantity = (itemId: string) => {
    return inventory?.find((inv) => inv.shop_item_id === itemId)?.quantity || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gem className="size-6 text-secondary" fill="currentColor" />
        <div>
          <p className="text-sm text-muted-foreground">Gem hiện có</p>
          <p className="text-2xl font-bold">{profile?.gems || 0}</p>
        </div>
      </div>

      {/* Streak Protection Items */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <h3 className="text-lg font-bold">Thuốc giữ Streak</h3>
        </div>
        <div className="grid gap-3">
          {streakProtectItems.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold">{item.name}</h4>
                    {getItemQuantity(item.id) > 0 && (
                      <Badge variant="secondary">
                        x{getItemQuantity(item.id)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <Button
                  onClick={() => handleBuy(item)}
                  disabled={
                    buyingId !== null ||
                    (profile?.gems || 0) < item.cost_gems
                  }
                  variant={
                    (profile?.gems || 0) < item.cost_gems ? "outline" : "default"
                  }
                  size="sm"
                >
                  {buyingId === item.id && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  <Gem className="mr-1 size-4" fill="currentColor" />
                  {item.cost_gems}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Heart Restoration Items */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Heart className="size-5 text-red-500" />
          <h3 className="text-lg font-bold">Hồi phục</h3>
        </div>
        <div className="grid gap-3">
          {heartItems.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold">{item.name}</h4>
                    {getItemQuantity(item.id) > 0 && (
                      <Badge variant="secondary">
                        x{getItemQuantity(item.id)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <Button
                  onClick={() => handleBuy(item)}
                  disabled={
                    buyingId !== null ||
                    (profile?.gems || 0) < item.cost_gems
                  }
                  variant={
                    (profile?.gems || 0) < item.cost_gems ? "outline" : "default"
                  }
                  size="sm"
                >
                  {buyingId === item.id && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  <Gem className="mr-1 size-4" fill="currentColor" />
                  {item.cost_gems}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
