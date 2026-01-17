import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSpeech } from "@/hooks/useSpeech";

interface Unit {
  id: string;
  title: string;
}

interface Lesson {
  id: string;
  title: string;
  unit_id: string;
  units?: { title: string };
}

interface Vocabulary {
  id: string;
  lesson_id: string;
  word: string;
  meaning: string;
  pronunciation: string | null;
  example: string | null;
  order_index: number;
  is_active: boolean;
  lessons?: { title: string; units?: { title: string } };
}

interface AdminVocabularyProps {
  onUpdate?: () => void;
}

const AdminVocabulary = ({ onUpdate }: AdminVocabularyProps) => {
  const { speak } = useSpeech();
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVocab, setEditingVocab] = useState<Vocabulary | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");

  const [formData, setFormData] = useState({
    lesson_id: "",
    word: "",
    meaning: "",
    pronunciation: "",
    example: "",
    order_index: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vocabRes, unitsRes, lessonsRes] = await Promise.all([
        supabase
          .from("vocabulary")
          .select("*, lessons(title, units(title))")
          .order("order_index"),
        supabase.from("units").select("id, title").order("order_index"),
        supabase.from("lessons").select("id, title, unit_id, units(title)").order("order_index"),
      ]);

      if (vocabRes.error) throw vocabRes.error;
      if (unitsRes.error) throw unitsRes.error;
      if (lessonsRes.error) throw lessonsRes.error;

      setVocabulary(vocabRes.data as Vocabulary[]);
      setUnits(unitsRes.data as Unit[]);
      setLessons(lessonsRes.data as Lesson[]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingVocab(null);
    setFormData({
      lesson_id: "",
      word: "",
      meaning: "",
      pronunciation: "",
      example: "",
      order_index: vocabulary.length,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (vocab: Vocabulary) => {
    setEditingVocab(vocab);
    setFormData({
      lesson_id: vocab.lesson_id,
      word: vocab.word,
      meaning: vocab.meaning,
      pronunciation: vocab.pronunciation || "",
      example: vocab.example || "",
      order_index: vocab.order_index,
      is_active: vocab.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.lesson_id || !formData.word.trim() || !formData.meaning.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    try {
      const data = {
        lesson_id: formData.lesson_id,
        word: formData.word.trim(),
        meaning: formData.meaning.trim(),
        pronunciation: formData.pronunciation.trim() || null,
        example: formData.example.trim() || null,
        order_index: formData.order_index,
        is_active: formData.is_active,
      };

      if (editingVocab) {
        const { error } = await supabase
          .from("vocabulary")
          .update(data)
          .eq("id", editingVocab.id);
        if (error) throw error;
        toast.success("Đã cập nhật từ vựng");
      } else {
        const { error } = await supabase.from("vocabulary").insert(data);
        if (error) throw error;
        toast.success("Đã thêm từ vựng mới");
      }

      setDialogOpen(false);
      fetchData();
      onUpdate?.();
    } catch (error) {
      console.error("Error saving vocabulary:", error);
      toast.error("Có lỗi xảy ra");
    }
  };

  const deleteVocab = async (id: string) => {
    try {
      const { error } = await supabase.from("vocabulary").delete().eq("id", id);
      if (error) throw error;
      toast.success("Đã xóa từ vựng");
      fetchData();
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting vocabulary:", error);
      toast.error("Có lỗi xảy ra");
    }
  };

  const filteredVocabulary = selectedUnit === "all"
    ? vocabulary
    : vocabulary.filter((v) => {
        const lesson = lessons.find((l) => l.id === v.lesson_id);
        return lesson?.unit_id === selectedUnit;
      });

  const filteredLessons = selectedUnit === "all"
    ? lessons
    : lessons.filter((l) => l.unit_id === selectedUnit);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Quản lý Từ vựng</h2>
          <p className="text-sm text-muted-foreground">
            {vocabulary.length} từ vựng
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Lọc theo đơn vị" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả đơn vị</SelectItem>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreateDialog}>
            <Plus className="size-4 mr-2" />
            Thêm từ vựng
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Từ vựng</TableHead>
              <TableHead>Nghĩa</TableHead>
              <TableHead>Phát âm</TableHead>
              <TableHead>Bài học</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVocabulary.map((vocab, index) => (
              <TableRow key={vocab.id}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => speak(vocab.word)}
                    >
                      <Volume2 className="size-4" />
                    </Button>
                    <span className="font-semibold">{vocab.word}</span>
                  </div>
                </TableCell>
                <TableCell>{vocab.meaning}</TableCell>
                <TableCell className="text-muted-foreground">
                  {vocab.pronunciation || "-"}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{vocab.lessons?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {vocab.lessons?.units?.title}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      vocab.is_active
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {vocab.is_active ? "Hiển thị" : "Ẩn"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(vocab)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bạn có chắc muốn xóa từ vựng "{vocab.word}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteVocab(vocab.id)}>
                            Xóa
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredVocabulary.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Chưa có từ vựng nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingVocab ? "Chỉnh sửa từ vựng" : "Thêm từ vựng mới"}
            </DialogTitle>
            <DialogDescription>
              Điền thông tin từ vựng bên dưới
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Bài học *</Label>
              <Select
                value={formData.lesson_id}
                onValueChange={(v) => setFormData({ ...formData, lesson_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bài học" />
                </SelectTrigger>
                <SelectContent>
                  {lessons.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      {lesson.units?.title} - {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Từ vựng *</Label>
                <Input
                  value={formData.word}
                  onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                  placeholder="Hello"
                />
              </div>
              <div>
                <Label>Nghĩa *</Label>
                <Input
                  value={formData.meaning}
                  onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                  placeholder="Xin chào"
                />
              </div>
            </div>

            <div>
              <Label>Phát âm</Label>
              <Input
                value={formData.pronunciation}
                onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                placeholder="/həˈloʊ/"
              />
            </div>

            <div>
              <Label>Ví dụ</Label>
              <Input
                value={formData.example}
                onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                placeholder="Hello, how are you?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Thứ tự</Label>
                <Input
                  type="number"
                  value={formData.order_index}
                  onChange={(e) =>
                    setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label>Hiển thị</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit}>
              {editingVocab ? "Cập nhật" : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminVocabulary;
