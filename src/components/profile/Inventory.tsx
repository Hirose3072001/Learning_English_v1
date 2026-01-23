import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

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

  // Fetch user inventory with shop item details
  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["user-inventory-details", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_shop_items")
        .select("id, shop_item_id, quantity, shop_items(name, description, type, effect_value, icon)")
        .eq("user_id", user.id)
        .gt("quantity", 0);
      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!user?.id,
  });

  // Fetch profile for hearts
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("hearts, max_hearts")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
  });

  const handleUseItem = async (inventoryId: string, item: InventoryItem["shop_items"]) => {
    if (!user?.id || !profile) return;

    setUsingId(inventoryId);
    try {
      if (item.type === "heart_restore") {
        // Restore hearts
        const newHearts = Math.min(
          profile.hearts + item.effect_value,
          profile.max_hearts
        );

        const { error: heartsError } = await supabase
          .from("profiles")
          .update({ hearts: newHearts })
          .eq("user_id", user.id);

        if (heartsError) throw heartsError;

        // Decrease item quantity
        const currentItem = inventory?.find((inv) => inv.id === inventoryId);
        if (currentItem) {
          if (currentItem.quantity > 1) {
            const { error: updateError } = await supabase
              .from("user_shop_items")
              .update({ quantity: currentItem.quantity - 1, used_at: new Date().toISOString() })
              .eq("id", inventoryId);
            if (updateError) throw updateError;
          } else {
            const { error: deleteError } = await supabase
              .from("user_shop_items")
              .delete()
              .eq("id", inventoryId);
            if (deleteError) throw deleteError;
          }
        }

        toast.success(`+${item.effect_value} ❤️ hồi phục! Tim hiện có: ${newHearts}/${profile.max_hearts}`);
      } else if (item.type === "streak_protect") {
        // Activate streak protection
        const today = new Date();
        const expiresAt = new Date(today.getTime() + item.effect_value * 24 * 60 * 60 * 1000);

        const { error: protectError } = await supabase
          .from("streak_protections")
          .insert({
            user_id: user.id,
            protection_days: item.effect_value,
            expires_at: expiresAt.toISOString(),
          });

        if (protectError) throw protectError;

        // Decrease item quantity
        const currentItem = inventory?.find((inv) => inv.id === inventoryId);
        if (currentItem) {
          if (currentItem.quantity > 1) {
            const { error: updateError } = await supabase
              .from("user_shop_items")
              .update({ quantity: currentItem.quantity - 1, used_at: new Date().toISOString() })
              .eq("id", inventoryId);
            if (updateError) throw updateError;
          } else {
            const { error: deleteError } = await supabase
              .from("user_shop_items")
              .delete()
              .eq("id", inventoryId);
            if (deleteError) throw deleteError;
          }
        }

        toast.success(`✓ Kích hoạt bảo vệ streak ${item.effect_value} ngày!`);
      }

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-inventory-details"] });
    } catch (error) {
      console.error("Error using item:", error);
      toast.error("Có lỗi xảy ra khi sử dụng item");
    } finally {
      setUsingId(null);
    }
  };

  const isLoading = inventoryLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inventory || inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Badge variant="outline" className="mb-4">Không có item</Badge>
        <p className="text-muted-foreground">Bạn chưa mua item nào. Hãy ghé cửa hàng!</p>
      </div>
    );
  }

  const heartItems = inventory.filter((inv) => inv.shop_items.type === "heart_restore");
  const protectItems = inventory.filter((inv) => inv.shop_items.type === "streak_protect");

  return (
    <div className="space-y-6">
      {profile && profile.hearts < profile.max_hearts && heartItems.length > 0 && (
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">
            Tim hiện có: {profile.hearts}/{profile.max_hearts}
          </p>
        </div>
      )}

      {/* Heart Restore Items */}
      {heartItems.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Heart className="size-5 text-red-500" />
            <h3 className="text-lg font-bold">Hồi phục Tim</h3>
          </div>
          <div className="grid gap-3">
            {heartItems.map((invItem) => (
              <Card key={invItem.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold">{invItem.shop_items.name}</h4>
                      <Badge variant="secondary">x{invItem.quantity}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Hồi phục +{invItem.shop_items.effect_value} trái tim
                    </p>
                  </div>
                  <Button
                    onClick={() => handleUseItem(invItem.id, invItem.shop_items)}
                    disabled={
                      usingId !== null ||
                      (profile && profile.hearts >= profile.max_hearts)
                    }
                    size="sm"
                  >
                    {usingId === invItem.id && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Sử dụng
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Streak Protection Items */}
      {protectItems.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <h3 className="text-lg font-bold">Bảo vệ Streak</h3>
          </div>
          <div className="grid gap-3">
            {protectItems.map((invItem) => (
              <Card key={invItem.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold">{invItem.shop_items.name}</h4>
                      <Badge variant="secondary">x{invItem.quantity}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Bảo vệ {invItem.shop_items.effect_value} ngày
                    </p>
                  </div>
                  <Button
                    onClick={() => handleUseItem(invItem.id, invItem.shop_items)}
                    disabled={usingId !== null}
                    size="sm"
                  >
                    {usingId === invItem.id && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Kích hoạt
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
