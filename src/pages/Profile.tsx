import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Flame,
  Zap,
  Trophy,
  Calendar,
  LogOut,
  Settings,
  BookOpen,
  Target,
  Shield,
  ShoppingBag,
  Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Shop } from "@/components/profile/Shop";
import { Inventory } from "@/components/profile/Inventory";
import { useState } from "react";

const Profile = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const stats = [
    { icon: Zap, label: "Tổng XP", value: (profile?.xp || 0).toLocaleString(), color: "text-primary" },
    { icon: Flame, label: "Streak", value: `${profile?.streak_count || 0} ngày`, color: "text-warning" },
    { icon: Trophy, label: "Hạng", value: "Đồng", color: "text-gold" },
    { icon: Calendar, label: "Ngày học", value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString("vi-VN") : "-", color: "text-secondary" },
  ];

  const achievements = [
    { icon: BookOpen, title: "Người mới", description: "Hoàn thành bài học đầu tiên", unlocked: (profile?.xp || 0) > 0 },
    { icon: Flame, title: "Đốt cháy", description: "Duy trì 7 ngày streak", unlocked: (profile?.streak_count || 0) >= 7 },
    { icon: Target, title: "Chính xác", description: "Hoàn thành 1 bài không sai", unlocked: false },
  ];

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="gap-1.5">
            <Shield className="size-4" />
            <span className="hidden sm:inline">Hồ sơ</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5">
            <Package className="size-4" />
            <span className="hidden sm:inline">Túi</span>
          </TabsTrigger>
          <TabsTrigger value="shop" className="gap-1.5">
            <ShoppingBag className="size-4" />
            <span className="hidden sm:inline">Cửa hàng</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Avatar className="mx-auto size-24 border-4 border-primary">
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
            {user?.user_metadata?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <h1 className="mt-4 text-2xl font-bold">
          {user?.user_metadata?.username || "Người học"}
        </h1>
        <p className="text-muted-foreground">{user?.email}</p>

        {/* Level */}
        <div className="mt-4">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Cấp độ {Math.floor((profile?.xp || 0) / 1000) + 1}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-sm text-primary font-semibold">{(profile?.xp || 0) % 1000}/1000 XP</span>
          </div>
          <Progress value={((profile?.xp || 0) % 1000) / 10} className="mt-2 h-3 max-w-xs mx-auto" />
        </div>
      </motion.div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 text-center">
              <stat.icon className={`mx-auto size-8 ${stat.color}`} fill="currentColor" />
              <p className="mt-2 text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Achievements */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold">Thành tựu</h2>
        <div className="space-y-3">
          {achievements.map((achievement, index) => (
            <motion.div
              key={achievement.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Card className={`p-4 ${!achievement.unlocked && "opacity-50"}`}>
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                    <achievement.icon className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">{achievement.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="mt-8 space-y-3">
        {isAdmin && (
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start gap-3 border-primary text-primary hover:bg-primary/10"
            onClick={() => navigate("/admin")}
          >
            <Shield className="size-5" />
            Trang quản trị
          </Button>
        )}
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-start gap-3"
          onClick={() => navigate("/settings")}
        >
          <Settings className="size-5" />
          Cài đặt
        </Button>
        <Button
          variant="destructive"
          size="lg"
          className="w-full justify-start gap-3"
          onClick={async () => {
            await supabase.auth.signOut();
            toast({ title: "Đã đăng xuất" });
            navigate("/");
          }}
        >
          <LogOut className="size-5" />
          Đăng xuất
        </Button>
      </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="mt-6">
          <Inventory />
        </TabsContent>

        {/* Shop Tab */}
        <TabsContent value="shop" className="mt-6">
          <Shop />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
