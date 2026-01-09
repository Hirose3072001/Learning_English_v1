import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, BookOpen, Layers, ArrowLeft, Shield, Trash2, Plus } from "lucide-react";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminUnits } from "@/components/admin/AdminUnits";
import { AdminLessons } from "@/components/admin/AdminLessons";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [stats, setStats] = useState({ users: 0, units: 0, lessons: 0 });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      toast.error("Bạn không có quyền truy cập trang này");
      navigate("/learn");
    }
  }, [loading, user, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    const [usersRes, unitsRes, lessonsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("units").select("id", { count: "exact", head: true }),
      supabase.from("lessons").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      users: usersRes.count || 0,
      units: unitsRes.count || 0,
      lessons: lessonsRes.count || 0,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-duo">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/learn")}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="size-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Quản trị viên</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/20 p-3">
                <Users className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Người dùng</p>
                <p className="text-2xl font-bold text-foreground">{stats.users}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-secondary/20 bg-gradient-to-br from-secondary/10 to-transparent">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-secondary/20 p-3">
                <Layers className="size-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Khóa học</p>
                <p className="text-2xl font-bold text-foreground">{stats.units}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gold/20 bg-gradient-to-br from-gold/10 to-transparent">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-gold/20 p-3">
                <BookOpen className="size-6 text-gold" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bài học</p>
                <p className="text-2xl font-bold text-foreground">{stats.lessons}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="users" className="gap-2">
              <Users className="size-4" />
              Người dùng
            </TabsTrigger>
            <TabsTrigger value="units" className="gap-2">
              <Layers className="size-4" />
              Khóa học
            </TabsTrigger>
            <TabsTrigger value="lessons" className="gap-2">
              <BookOpen className="size-4" />
              Bài học
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <AdminUsers onUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="units">
            <AdminUnits onUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="lessons">
            <AdminLessons onUpdate={fetchStats} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
