import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, BookOpen, Layers, ArrowLeft, Shield, BookText, HelpCircle } from "lucide-react";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminUnits } from "@/components/admin/AdminUnits";
import { AdminLessons } from "@/components/admin/AdminLessons";
import { AdminQuestions } from "@/components/admin/AdminQuestions";
import AdminVocabulary from "@/components/admin/AdminVocabulary";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [stats, setStats] = useState({ users: 0, units: 0, lessons: 0, questions: 0 });

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
    const [usersRes, unitsRes, lessonsRes, questionsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("units").select("id", { count: "exact", head: true }),
      supabase.from("lessons").select("id", { count: "exact", head: true }),
      supabase.from("questions").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      users: usersRes.count || 0,
      units: unitsRes.count || 0,
      lessons: lessonsRes.count || 0,
      questions: questionsRes.count || 0,
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
        <div className="mb-6 grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-primary/20 p-2">
                <Users className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Người dùng</p>
                <p className="text-xl font-bold text-foreground">{stats.users}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-secondary/20 p-2">
                <Layers className="size-5 text-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Chương</p>
                <p className="text-xl font-bold text-foreground">{stats.units}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-gold/20 p-2">
                <BookOpen className="size-5 text-gold" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Bài học</p>
                <p className="text-xl font-bold text-foreground">{stats.lessons}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-accent/20 p-2">
                <HelpCircle className="size-5 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Câu hỏi</p>
                <p className="text-xl font-bold text-foreground">{stats.questions}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 h-auto bg-muted p-1">
            <TabsTrigger value="users" className="gap-1.5 py-2 text-xs sm:text-sm">
              <Users className="size-4" />
              <span className="hidden sm:inline">Người dùng</span>
            </TabsTrigger>
            <TabsTrigger value="units" className="gap-1.5 py-2 text-xs sm:text-sm">
              <Layers className="size-4" />
              <span className="hidden sm:inline">Chương</span>
            </TabsTrigger>
            <TabsTrigger value="lessons" className="gap-1.5 py-2 text-xs sm:text-sm">
              <BookOpen className="size-4" />
              <span className="hidden sm:inline">Bài học</span>
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-1.5 py-2 text-xs sm:text-sm">
              <HelpCircle className="size-4" />
              <span className="hidden sm:inline">Câu hỏi</span>
            </TabsTrigger>
            <TabsTrigger value="vocabulary" className="gap-1.5 py-2 text-xs sm:text-sm">
              <BookText className="size-4" />
              <span className="hidden sm:inline">Từ vựng</span>
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

          <TabsContent value="questions">
            <AdminQuestions onUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="vocabulary">
            <AdminVocabulary onUpdate={fetchStats} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
