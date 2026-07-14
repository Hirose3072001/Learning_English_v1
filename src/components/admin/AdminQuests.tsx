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
import { Plus, Pencil, Trash2, BookOpen, Zap, Flame, Target, Loader2 } from "lucide-react";
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

interface Quest {
  id: string;
  type: string;
  title: string;
  description: string | null;
  target_type: string;
  target_value: number;
  reward_gems: number;
  reward_streak: number;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

interface AdminQuestsProps {
  onUpdate?: () => void;
}

export const AdminQuests = ({ onUpdate }: AdminQuestsProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [formData, setFormData] = useState({
    type: "daily",
    title: "",
    description: "",
    target_type: "lessons",
    target_value: 1,
    reward_gems: 10,
    reward_streak: 0,
    icon: "book",
    is_active: true,
  });

  const { data: quests = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["admin-quests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("*")
        .order("type", { ascending: true })
        .order("target_value", { ascending: true });

      if (error) throw error;
      return (data || []) as Quest[];
    },
  });

  const openCreateDialog = () => {
    setEditingQuest(null);
    setFormData({
      type: "daily",
      title: "",
      description: "",
      target_type: "lessons",
      target_value: 1,
      reward_gems: 10,
      reward_streak: 0,
      icon: "book",
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (quest: Quest) => {
    setEditingQuest(quest);
    setFormData({
      type: quest.type || "daily",
      title: quest.title,
      description: quest.description || "",
      target_type: quest.target_type || "lessons",
      target_value: quest.target_value || 1,
      reward_gems: quest.reward_gems || 10,
      reward_streak: quest.reward_streak || 0,
      icon: quest.icon || "book",
      is_active: quest.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tên nhiệm vụ");
      return;
    }

    try {
      const payload = {
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        target_type: formData.target_type,
        target_value: Number(formData.target_value),
        reward_gems: Number(formData.reward_gems),
        reward_streak: Number(formData.reward_streak),
        icon: formData.icon,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingQuest) {
        const { error } = await supabase
          .from("quests")
          .update(payload)
          .eq("id", editingQuest.id);

        if (error) throw error;
        toast.success("Cập nhật nhiệm vụ thành công");
      } else {
        const { error } = await supabase
          .from("quests")
          .insert([payload]);

        if (error) throw error;
        toast.success("Thêm nhiệm vụ thành công");
      }

      setDialogOpen(false);
      refetch();
      onUpdate?.();
    } catch (err: any) {
      toast.error(err.message || "Đã xảy ra lỗi khi lưu nhiệm vụ");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("quests")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Đã xóa nhiệm vụ");
      refetch();
      onUpdate?.();
    } catch (err: any) {
      toast.error(err.message || "Không thể xóa nhiệm vụ này");
    }
  };

  const renderIcon = (iconName: string | null) => {
    switch (iconName) {
      case "book": return <BookOpen className="size-4 text-primary" />;
      case "zap": return <Zap className="size-4 text-warning" />;
      case "flame": return <Flame className="size-4 text-destructive" />;
      case "target": return <Target className="size-4 text-secondary" />;
      default: return <Target className="size-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="border shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-bold">Quản lý Danh sách Nhiệm vụ</CardTitle>
        <Button onClick={openCreateDialog} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="size-4" /> Thêm Nhiệm vụ
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : quests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Chưa có nhiệm vụ nào được tạo. Hãy nhấn "Thêm Nhiệm vụ" để bắt đầu.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Icon</TableHead>
                  <TableHead>Tên nhiệm vụ</TableHead>
                  <TableHead>Chu kỳ</TableHead>
                  <TableHead>Mục tiêu</TableHead>
                  <TableHead>Phần thưởng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quests.map((quest) => (
                  <TableRow key={quest.id}>
                    <TableCell>{renderIcon(quest.icon)}</TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold text-foreground">{quest.title}</p>
                        {quest.description && (
                          <p className="text-xs text-muted-foreground">{quest.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={quest.type === "daily" ? "default" : "secondary"}>
                        {quest.type === "daily" ? "Hàng ngày" : "Hàng tuần"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {quest.target_value} {quest.target_type === "lessons" ? "bài học" : quest.target_type === "xp" ? "XP" : "ngày streak"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="text-amber-600 flex items-center gap-1">💎 {quest.reward_gems}</span>
                        {quest.reward_streak > 0 && (
                          <span className="text-orange-600 flex items-center gap-1">🔥 +{quest.reward_streak}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={quest.is_active ? "default" : "outline"} className={quest.is_active ? "bg-green-600 hover:bg-green-700" : ""}>
                        {quest.is_active ? "Đang bật" : "Đang tắt"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(quest)}
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
                              <AlertDialogTitle>Xác nhận xóa nhiệm vụ</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc chắn muốn xóa nhiệm vụ "{quest.title}" không? Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(quest.id)}
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

      {/* Dialog Thêm/Sửa Nhiệm Vụ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingQuest ? "Sửa Nhiệm vụ" : "Thêm Nhiệm vụ mới"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Chu kỳ</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Hàng ngày (Daily)</SelectItem>
                    <SelectItem value="weekly">Hàng tuần (Weekly)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Biểu tượng (Icon)</Label>
                <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="book">📖 Sách / Bài học (Book)</SelectItem>
                    <SelectItem value="zap">⚡ Kinh nghiệm (Zap/XP)</SelectItem>
                    <SelectItem value="flame">🔥 Chuỗi ngày (Streak)</SelectItem>
                    <SelectItem value="target">🎯 Mục tiêu (Target)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tên nhiệm vụ <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ví dụ: Hoàn thành 1 bài học"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Mô tả ngắn</Label>
              <Textarea
                placeholder="Ví dụ: Học một bài học mới hôm nay"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loại mục tiêu</Label>
                <Select value={formData.target_type} onValueChange={(v) => setFormData({ ...formData, target_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lessons">Số bài học hoàn thành</SelectItem>
                    <SelectItem value="xp">Điểm kinh nghiệm (XP)</SelectItem>
                    <SelectItem value="streak">Chuỗi ngày (Streak)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Số lượng mục tiêu</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Thưởng Đá quý (Gems)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.reward_gems}
                  onChange={(e) => setFormData({ ...formData, reward_gems: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Thưởng ngày Streak</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.reward_streak}
                  onChange={(e) => setFormData({ ...formData, reward_streak: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Label htmlFor="is-active" className="cursor-pointer">Kích hoạt nhiệm vụ</Label>
              <Switch
                id="is-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
                {editingQuest ? "Lưu thay đổi" : "Tạo Nhiệm vụ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
