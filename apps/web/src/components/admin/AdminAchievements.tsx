import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen, Zap, Flame, Target, Trophy, Gem, Star, Award, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
  reward_gems: number;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

interface AdminAchievementsProps {
  onUpdate?: () => void;
}

export const AdminAchievements = ({ onUpdate }: AdminAchievementsProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Achievement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    icon: "trophy",
    condition_type: "xp",
    condition_value: 100,
    reward_gems: 50,
    is_active: true,
    order_index: 0,
  });

  const { data: achievements = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ["admin-achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements" as any)
        .select("*")
        .order("order_index", { ascending: true })
        .order("condition_value", { ascending: true });

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          return [] as Achievement[];
        }
        throw error;
      }
      return (data || []) as unknown as Achievement[];
    },
  });

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      description: "",
      icon: "trophy",
      condition_type: "xp",
      condition_value: 100,
      reward_gems: 50,
      is_active: true,
      order_index: achievements.length + 1,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: Achievement) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      icon: item.icon || "trophy",
      condition_type: item.condition_type || "xp",
      condition_value: item.condition_value || 100,
      reward_gems: item.reward_gems || 50,
      is_active: item.is_active ?? true,
      order_index: item.order_index || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tên thành tựu");
      return;
    }

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        icon: formData.icon,
        condition_type: formData.condition_type,
        condition_value: Number(formData.condition_value),
        reward_gems: Number(formData.reward_gems),
        is_active: formData.is_active,
        order_index: Number(formData.order_index),
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        const { error } = await supabase
          .from("achievements" as any)
          .update(payload)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Cập nhật thành tựu thành công");
      } else {
        const { error } = await supabase
          .from("achievements" as any)
          .insert([payload]);

        if (error) throw error;
        toast.success("Thêm thành tựu mới thành công");
      }

      setDialogOpen(false);
      refetch();
      onUpdate?.();
    } catch (err: any) {
      if (err.code === "42P01" || err.message?.includes("does not exist")) {
        toast.error("Bảng 'achievements' chưa được tạo trên cơ sở dữ liệu. Vui lòng chạy file migration `20260714_create_achievements_table.sql` trong Supabase!");
      } else {
        toast.error(err.message || "Đã xảy ra lỗi khi lưu thành tựu");
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("achievements" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Đã xóa thành tựu");
      refetch();
      onUpdate?.();
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa thành tựu này");
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "book": return <BookOpen className="size-4 text-primary" />;
      case "zap": return <Zap className="size-4 text-warning" />;
      case "flame": return <Flame className="size-4 text-destructive" />;
      case "target": return <Target className="size-4 text-secondary" />;
      case "trophy": return <Trophy className="size-4 text-amber-500" />;
      case "gem": return <Gem className="size-4 text-cyan-500" />;
      case "star": return <Star className="size-4 text-yellow-500" />;
      default: return <Award className="size-4 text-amber-600" />;
    }
  };

  return (
    <Card className="border shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-bold">Quản lý Danh sách Thành tựu & Huy hiệu</CardTitle>
        <Button onClick={openCreateDialog} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="size-4" /> Thêm Thành tựu
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : queryError || (achievements.length === 0 && (queryError as any)?.code === "42P01") ? (
          <div className="text-center py-8 px-4 bg-muted/40 rounded-lg border border-dashed">
            <Trophy className="size-10 text-muted-foreground mx-auto mb-2" />
            <p className="font-semibold text-foreground mb-1">Bảng Thành tựu (Achievements) chưa được khởi tạo trên Supabase</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
              Vui lòng chạy file SQL <code className="bg-muted px-1 rounded">20260714_create_achievements_table.sql</code> trong mục SQL Editor của Supabase Dashboard để kích hoạt quản lý danh sách thành tựu.
            </p>
          </div>
        ) : achievements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Chưa có thành tựu nào được tạo. Hãy nhấn "Thêm Thành tựu" để bắt đầu.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Icon</TableHead>
                  <TableHead>Tên thành tựu</TableHead>
                  <TableHead>Điều kiện mở khóa</TableHead>
                  <TableHead>Mốc đạt</TableHead>
                  <TableHead>Phần thưởng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {achievements.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{renderIcon(item.icon)}</TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {item.condition_type === "xp" ? "Tích lũy XP" : item.condition_type === "streak" ? "Duy trì Streak" : "Hoàn thành bài học"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-semibold">
                      {item.condition_value} {item.condition_type === "xp" ? "XP" : item.condition_type === "streak" ? "ngày" : "bài"}
                    </TableCell>
                    <TableCell>
                      <span className="text-amber-600 font-medium flex items-center gap-1 text-sm">
                        💎 {item.reward_gems}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "default" : "outline"} className={item.is_active ? "bg-green-600 hover:bg-green-700" : ""}>
                        {item.is_active ? "Đang bật" : "Đang tắt"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                          title="Sửa"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Xóa">
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xác nhận xóa thành tựu</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc chắn muốn xóa thành tựu "{item.title}" không? Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(item.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Dialog Thêm/Sửa Thành tựu */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Sửa Thành tựu" : "Thêm Thành tựu mới"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Biểu tượng (Icon)</Label>
                <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trophy">🏆 Cúp vàng (Trophy)</SelectItem>
                    <SelectItem value="flame">🔥 Ngọn lửa (Flame)</SelectItem>
                    <SelectItem value="zap">⚡ Tia sét / XP (Zap)</SelectItem>
                    <SelectItem value="book">📖 Bài học (Book)</SelectItem>
                    <SelectItem value="target">🎯 Mục tiêu (Target)</SelectItem>
                    <SelectItem value="gem">💎 Đá quý (Gem)</SelectItem>
                    <SelectItem value="star">⭐ Ngôi sao (Star)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Thứ tự hiển thị</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tên Thành tựu <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ví dụ: Đốt cháy, Bậc thầy ngữ pháp..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Mô tả chi tiết</Label>
              <Textarea
                placeholder="Ví dụ: Duy trì 7 ngày streak liên tục"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loại điều kiện mở khóa</Label>
                <Select value={formData.condition_type} onValueChange={(v) => setFormData({ ...formData, condition_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xp">Tổng kinh nghiệm (XP)</SelectItem>
                    <SelectItem value="streak">Chuỗi ngày (Streak)</SelectItem>
                    <SelectItem value="lessons">Số bài học hoàn thành</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mốc yêu cầu đạt được</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.condition_value}
                  onChange={(e) => setFormData({ ...formData, condition_value: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phần thưởng Đá quý (Gems)</Label>
              <Input
                type="number"
                min={0}
                value={formData.reward_gems}
                onChange={(e) => setFormData({ ...formData, reward_gems: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Label htmlFor="is-active-achievement" className="cursor-pointer">Kích hoạt thành tựu</Label>
              <Switch
                id="is-active-achievement"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
                {editingItem ? "Lưu thay đổi" : "Tạo Thành tựu"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
