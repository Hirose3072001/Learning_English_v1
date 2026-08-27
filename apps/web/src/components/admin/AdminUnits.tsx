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
  description: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

interface AdminUnitsProps {
  onUpdate: () => void;
}

export const AdminUnits = ({ onUpdate }: AdminUnitsProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    order_index: 0,
    is_active: true,
  });

  const { data: units = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["admin-units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const openCreateDialog = () => {
    setEditingUnit(null);
    setFormData({
      title: "",
      description: "",
      order_index: units.length,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      title: unit.title,
      description: unit.description || "",
      order_index: unit.order_index,
      is_active: unit.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tên khóa học");
      return;
    }

    if (editingUnit) {
      const { error } = await supabase
        .from("units")
        .update({
          title: formData.title,
          description: formData.description || null,
          order_index: formData.order_index,
          is_active: formData.is_active,
        })
        .eq("id", editingUnit.id);

      if (error) {
        toast.error("Lỗi cập nhật khóa học");
        return;
      }
      toast.success("Đã cập nhật khóa học");
    } else {
      const { error } = await supabase.from("units").insert({
        title: formData.title,
        description: formData.description || null,
        order_index: formData.order_index,
        is_active: formData.is_active,
      });

      if (error) {
        toast.error("Lỗi tạo khóa học");
        return;
      }
      toast.success("Đã tạo khóa học mới");
    }

    setDialogOpen(false);
    refetch();
    onUpdate();
  };

  const deleteUnit = async (id: string) => {
    const { error } = await supabase.from("units").delete().eq("id", id);

    if (error) {
      toast.error("Lỗi xóa khóa học");
      return;
    }

    toast.success("Đã xóa khóa học");
    refetch();
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
          Quản lý chương
          <Badge variant="secondary">{units.length} chương</Badge>
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} size="sm">
              <Plus className="mr-2 size-4" />
              Thêm chương
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUnit ? "Sửa chương" : "Thêm chương mới"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tên chương</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nhập tên chương"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nhập mô tả chương"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Thứ tự</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                />
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
                  {editingUnit ? "Cập nhật" : "Tạo mới"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {units.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Chưa có chương nào. Nhấn "Thêm chương" để bắt đầu.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="min-w-[120px]">Tên chương</TableHead>
                  <TableHead className="min-w-[150px]">Mô tả</TableHead>
                  <TableHead className="w-20">Trạng thái</TableHead>
                  <TableHead className="w-24 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.order_index}</TableCell>
                    <TableCell>
                      <p className="font-medium line-clamp-1">{unit.title}</p>
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {unit.description || "-"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {unit.is_active ? (
                        <Badge className="bg-success text-xs">Hiện</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Ẩn</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEditDialog(unit)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xóa chương?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc muốn xóa chương "{unit.title}"? Tất cả bài học trong chương này cũng sẽ bị xóa.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUnit(unit.id)}
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
