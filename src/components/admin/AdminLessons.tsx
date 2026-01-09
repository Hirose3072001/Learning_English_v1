import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface Unit {
  id: string;
  title: string;
}

interface Lesson {
  id: string;
  unit_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  order_index: number;
  xp_reward: number;
  is_active: boolean;
  created_at: string;
  units?: Unit;
}

interface AdminLessonsProps {
  onUpdate: () => void;
}

export const AdminLessons = ({ onUpdate }: AdminLessonsProps) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [formData, setFormData] = useState({
    unit_id: "",
    title: "",
    description: "",
    icon: "star",
    order_index: 0,
    xp_reward: 10,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [lessonsRes, unitsRes] = await Promise.all([
      supabase
        .from("lessons")
        .select("*, units(id, title)")
        .order("order_index", { ascending: true }),
      supabase
        .from("units")
        .select("id, title")
        .order("order_index", { ascending: true }),
    ]);

    if (lessonsRes.error) {
      toast.error("Lỗi tải danh sách bài học");
    } else {
      setLessons(lessonsRes.data || []);
    }

    if (unitsRes.error) {
      toast.error("Lỗi tải danh sách khóa học");
    } else {
      setUnits(unitsRes.data || []);
    }

    setLoading(false);
  };

  const openCreateDialog = () => {
    if (units.length === 0) {
      toast.error("Vui lòng tạo khóa học trước khi thêm bài học");
      return;
    }
    setEditingLesson(null);
    setFormData({
      unit_id: units[0].id,
      title: "",
      description: "",
      icon: "star",
      order_index: lessons.length,
      xp_reward: 10,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      unit_id: lesson.unit_id,
      title: lesson.title,
      description: lesson.description || "",
      icon: lesson.icon || "star",
      order_index: lesson.order_index,
      xp_reward: lesson.xp_reward,
      is_active: lesson.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tên bài học");
      return;
    }
    if (!formData.unit_id) {
      toast.error("Vui lòng chọn khóa học");
      return;
    }

    if (editingLesson) {
      const { error } = await supabase
        .from("lessons")
        .update({
          unit_id: formData.unit_id,
          title: formData.title,
          description: formData.description || null,
          icon: formData.icon,
          order_index: formData.order_index,
          xp_reward: formData.xp_reward,
          is_active: formData.is_active,
        })
        .eq("id", editingLesson.id);

      if (error) {
        toast.error("Lỗi cập nhật bài học");
        return;
      }
      toast.success("Đã cập nhật bài học");
    } else {
      const { error } = await supabase.from("lessons").insert({
        unit_id: formData.unit_id,
        title: formData.title,
        description: formData.description || null,
        icon: formData.icon,
        order_index: formData.order_index,
        xp_reward: formData.xp_reward,
        is_active: formData.is_active,
      });

      if (error) {
        toast.error("Lỗi tạo bài học");
        return;
      }
      toast.success("Đã tạo bài học mới");
    }

    setDialogOpen(false);
    fetchData();
    onUpdate();
  };

  const deleteLesson = async (id: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", id);

    if (error) {
      toast.error("Lỗi xóa bài học");
      return;
    }

    toast.success("Đã xóa bài học");
    fetchData();
    onUpdate();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          Quản lý bài học
          <Badge variant="secondary">{lessons.length} bài</Badge>
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
              Thêm bài học
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLesson ? "Sửa bài học" : "Thêm bài học mới"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Khóa học</Label>
                <Select
                  value={formData.unit_id}
                  onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn khóa học" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Tên bài học</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nhập tên bài học"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nhập mô tả bài học"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order">Thứ tự</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xp">Điểm XP</Label>
                  <Input
                    id="xp"
                    type="number"
                    value={formData.xp_reward}
                    onChange={(e) => setFormData({ ...formData, xp_reward: parseInt(e.target.value) || 10 })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Kích hoạt</Label>
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  <X className="mr-2 size-4" />
                  Hủy
                </Button>
                <Button onClick={handleSubmit}>
                  <Save className="mr-2 size-4" />
                  {editingLesson ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {lessons.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Chưa có bài học nào. Nhấn "Thêm bài học" để bắt đầu.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thứ tự</TableHead>
                <TableHead>Tên bài học</TableHead>
                <TableHead>Khóa học</TableHead>
                <TableHead>XP</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((lesson) => (
                <TableRow key={lesson.id}>
                  <TableCell>{lesson.order_index}</TableCell>
                  <TableCell className="font-medium">{lesson.title}</TableCell>
                  <TableCell>{lesson.units?.title || "-"}</TableCell>
                  <TableCell>{lesson.xp_reward}</TableCell>
                  <TableCell>
                    {lesson.is_active ? (
                      <Badge className="bg-success">Hoạt động</Badge>
                    ) : (
                      <Badge variant="secondary">Ẩn</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(lesson)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa bài học?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc muốn xóa bài học "{lesson.title}"? Hành động này không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteLesson(lesson.id)}
                              className="bg-destructive text-destructive-foreground"
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
        )}
      </CardContent>
    </Card>
  );
};
