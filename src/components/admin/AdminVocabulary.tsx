import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Plus, Pencil, Trash2, Loader2, Volume2, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSpeech } from "@/hooks/useSpeech";
import ExcelJS from "exceljs";

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

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ["admin-vocabulary-data"],
    queryFn: async () => {
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

      return {
        vocabulary: vocabRes.data as Vocabulary[],
        units: unitsRes.data as Unit[],
        lessons: lessonsRes.data as Lesson[],
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const vocabulary = data?.vocabulary || [];
  const units = data?.units || [];
  const lessons = data?.lessons || [];

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
      refetch();
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
      refetch();
      onUpdate?.();
    } catch (error) {
      console.error("Error deleting vocabulary:", error);
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleExportVocab = async () => {
    const exportData = filteredVocabulary.map((v, index) => ({
      STT: index + 1,
      "Chương": v.lessons?.units?.title || "",
      "Bài học": v.lessons?.title || "",
      "Từ vựng": v.word,
      "Nghĩa": v.meaning,
      "Phát âm": v.pronunciation || "",
      "Ví dụ": v.example || "",
      "Trạng thái": v.is_active ? "Hiển thị" : "Ẩn",
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Từ vựng");

    if (exportData.length > 0) {
      worksheet.columns = Object.keys(exportData[0]).map(key => ({ header: key, key }));
      exportData.forEach(row => worksheet.addRow(row));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tu-vung.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất file Excel");
  };

  const handleImportVocab = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        toast.error("File không hợp lệ");
        return;
      }

      const jsonData: Record<string, unknown>[] = [];
      const headers: string[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell) => {
            headers.push(cell.value?.toString() || "");
          });
        } else {
          const rowData: Record<string, unknown> = {};
          row.eachCell((cell, colNumber) => {
            rowData[headers[colNumber - 1]] = cell.value;
          });
          jsonData.push(rowData);
        }
      });

      if (jsonData.length === 0) {
        toast.error("File không có dữ liệu");
        return;
      }

      let importedCount = 0;
      for (const row of jsonData) {
        const lessonTitle = String(row["Bài học"] || "").trim();
        const word = String(row["Từ vựng"] || "").trim();
        const meaning = String(row["Nghĩa"] || "").trim();

        if (!lessonTitle || !word || !meaning) continue;

        const lesson = lessons.find((l) => l.title.toLowerCase() === lessonTitle.toLowerCase());
        if (!lesson) {
          console.warn(`Không tìm thấy bài học: ${lessonTitle}`);
          continue;
        }

        const { error } = await supabase.from("vocabulary").insert({
          lesson_id: lesson.id,
          word,
          meaning,
          pronunciation: String(row["Phát âm"] || "").trim() || null,
          example: String(row["Ví dụ"] || "").trim() || null,
          order_index: importedCount,
          is_active: String(row["Trạng thái"] || "Hiển thị").toLowerCase() !== "ẩn",
        });

        if (!error) importedCount++;
      }

      toast.success(`Đã nhập ${importedCount} từ vựng`);
      refetch();
      onUpdate?.();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Lỗi đọc file Excel");
    }

    event.target.value = "";
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
    <Card className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="shrink-0">
            <h2 className="text-lg font-bold whitespace-nowrap">Quản lý Từ vựng</h2>
            <p className="text-sm text-muted-foreground">
              {vocabulary.length} từ vựng
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="w-32 sm:w-40">
                <SelectValue placeholder="Lọc chương" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả chương</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="size-4 mr-1" />
            Thêm
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportVocab}>
            <Download className="size-4 mr-1" />
            <span className="hidden sm:inline">Xuất </span>Excel
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="size-4 mr-1" />
                <span className="hidden sm:inline">Nhập </span>Excel
              </span>
            </Button>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportVocab}
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead className="min-w-[100px]">Từ vựng</TableHead>
              <TableHead className="min-w-[80px]">Nghĩa</TableHead>
              <TableHead className="w-20 hidden md:table-cell">Phát âm</TableHead>
              <TableHead className="w-24">Bài học</TableHead>
              <TableHead className="w-16">T.Thái</TableHead>
              <TableHead className="w-20 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVocabulary.map((vocab, index) => (
              <TableRow key={vocab.id}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => speak(vocab.word)}
                    >
                      <Volume2 className="size-3" />
                    </Button>
                    <span className="font-semibold">{vocab.word}</span>
                  </div>
                </TableCell>
                <TableCell>{vocab.meaning}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {vocab.pronunciation || "-"}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="line-clamp-1">{vocab.lessons?.title}</p>
                    <p className="text-muted-foreground line-clamp-1">
                      {vocab.lessons?.units?.title}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${vocab.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                  >
                    {vocab.is_active ? "Hiện" : "Ẩn"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => openEditDialog(vocab)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <Trash2 className="size-3 text-destructive" />
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
