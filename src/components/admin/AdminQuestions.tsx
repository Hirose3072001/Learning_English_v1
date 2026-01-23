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
import { Plus, Pencil, Trash2, X, Save, Upload, Download, HelpCircle } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import ExcelJS from "exceljs";

interface Unit {
  id: string;
  title: string;
  order_index: number;
}

interface Lesson {
  id: string;
  title: string;
  unit_id: string;
  order_index: number;
  units?: { title: string; order_index: number };
}

interface Question {
  id: string;
  lesson_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  lessons?: { title: string; order_index: number; units?: { title: string; order_index: number } };
}

interface AdminQuestionsProps {
  onUpdate: () => void;
}

export const AdminQuestions = ({ onUpdate }: AdminQuestionsProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedLesson, setSelectedLesson] = useState<string>("all");
  const [formData, setFormData] = useState({
    lesson_id: "",
    question: "",
    options: ["", "", "", ""],
    correct_index: 0,
    explanation: "",
    order_index: 0,
    is_active: true,
  });

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ["admin-questions-data"],
    queryFn: async () => {
      const [questionsRes, unitsRes, lessonsRes] = await Promise.all([
        supabase
          .from("questions")
          .select("*, lessons(title, order_index, units(title, order_index))")
          .order("order_index", { ascending: true }),
        supabase
          .from("units")
          .select("id, title, order_index")
          .order("order_index", { ascending: true }),
        supabase
          .from("lessons")
          .select("id, title, unit_id, order_index, units(title, order_index)")
          .order("order_index", { ascending: true }),
      ]);

      if (questionsRes.error) throw questionsRes.error;
      if (unitsRes.error) throw unitsRes.error;
      if (lessonsRes.error) throw lessonsRes.error;

      const formattedQuestions = (questionsRes.data || []).map((q) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string || "[]"),
      }));

      return {
        questions: formattedQuestions,
        units: unitsRes.data || [],
        lessons: lessonsRes.data || [],
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const questions = data?.questions || [];
  const units = data?.units || [];
  const lessons = data?.lessons || [];

  const filteredLessons = selectedUnit === "all"
    ? lessons
    : lessons.filter((l) => l.unit_id === selectedUnit);

  const filteredQuestions = questions.filter((q) => {
    if (selectedLesson !== "all") {
      return q.lesson_id === selectedLesson;
    }
    if (selectedUnit !== "all") {
      const lesson = lessons.find((l) => l.id === q.lesson_id);
      return lesson?.unit_id === selectedUnit;
    }
    return true;
  });

  const openCreateDialog = () => {
    if (lessons.length === 0) {
      toast.error("Vui lòng tạo bài học trước khi thêm câu hỏi");
      return;
    }
    setEditingQuestion(null);
    setFormData({
      lesson_id: selectedLesson !== "all" ? selectedLesson : lessons[0].id,
      question: "",
      options: ["", "", "", ""],
      correct_index: 0,
      explanation: "",
      order_index: filteredQuestions.length,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (question: Question) => {
    setEditingQuestion(question);
    const opts = [...question.options];
    while (opts.length < 4) opts.push("");
    setFormData({
      lesson_id: question.lesson_id,
      question: question.question,
      options: opts,
      correct_index: question.correct_index,
      explanation: question.explanation || "",
      order_index: question.order_index,
      is_active: question.is_active,
    });
    setDialogOpen(true);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async () => {
    if (!formData.question.trim()) {
      toast.error("Vui lòng nhập câu hỏi");
      return;
    }
    if (!formData.lesson_id) {
      toast.error("Vui lòng chọn bài học");
      return;
    }

    const validOptions = formData.options.filter((o) => o.trim() !== "");
    if (validOptions.length < 2) {
      toast.error("Vui lòng nhập ít nhất 2 đáp án");
      return;
    }
    if (formData.correct_index >= validOptions.length) {
      toast.error("Đáp án đúng không hợp lệ");
      return;
    }

    const data = {
      lesson_id: formData.lesson_id,
      question: formData.question.trim(),
      options: validOptions,
      correct_index: formData.correct_index,
      explanation: formData.explanation.trim() || null,
      order_index: formData.order_index,
      is_active: formData.is_active,
    };

    if (editingQuestion) {
      const { error } = await supabase
        .from("questions")
        .update(data)
        .eq("id", editingQuestion.id);

      if (error) {
        toast.error("Lỗi cập nhật câu hỏi");
        return;
      }
      toast.success("Đã cập nhật câu hỏi");
    } else {
      const { error } = await supabase.from("questions").insert(data);

      if (error) {
        toast.error("Lỗi tạo câu hỏi");
        return;
      }
      toast.success("Đã tạo câu hỏi mới");
    }

    setDialogOpen(false);
    refetch();
    onUpdate();
  };

  const deleteQuestion = async (id: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);

    if (error) {
      toast.error("Lỗi xóa câu hỏi");
      return;
    }

    toast.success("Đã xóa câu hỏi");
    refetch();
    onUpdate();
  };

  const handleExport = async () => {
    const exportData = filteredQuestions.map((q, index) => ({
      STT: index + 1,
      "Chương": q.lessons?.units?.title || "",
      "Bài học": q.lessons?.title || "",
      "Câu hỏi": q.question,
      "Đáp án A": q.options[0] || "",
      "Đáp án B": q.options[1] || "",
      "Đáp án C": q.options[2] || "",
      "Đáp án D": q.options[3] || "",
      "Đáp án đúng": String.fromCharCode(65 + q.correct_index),
      "Giải thích": q.explanation || "",
      "Trạng thái": q.is_active ? "Hiển thị" : "Ẩn",
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Câu hỏi");

    if (exportData.length > 0) {
      worksheet.columns = Object.keys(exportData[0]).map(key => ({ header: key, key }));
      exportData.forEach(row => worksheet.addRow(row));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cau-hoi.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất file Excel");
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        const question = String(row["Câu hỏi"] || "").trim();

        if (!lessonTitle || !question) continue;

        const lesson = lessons.find((l) => l.title.toLowerCase() === lessonTitle.toLowerCase());
        if (!lesson) {
          console.warn(`Không tìm thấy bài học: ${lessonTitle}`);
          continue;
        }

        const options = [
          String(row["Đáp án A"] || "").trim(),
          String(row["Đáp án B"] || "").trim(),
          String(row["Đáp án C"] || "").trim(),
          String(row["Đáp án D"] || "").trim(),
        ].filter((o) => o !== "");

        const correctAnswer = String(row["Đáp án đúng"] || "A").toUpperCase();
        const correctIndex = correctAnswer.charCodeAt(0) - 65;

        const { error } = await supabase.from("questions").insert({
          lesson_id: lesson.id,
          question,
          options,
          correct_index: Math.min(correctIndex, options.length - 1),
          explanation: String(row["Giải thích"] || "").trim() || null,
          order_index: importedCount,
          is_active: String(row["Trạng thái"] || "Hiển thị").toLowerCase() !== "ẩn",
        });

        if (!error) importedCount++;
      }

      toast.success(`Đã nhập ${importedCount} câu hỏi`);
      refetch();
      onUpdate();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Lỗi đọc file Excel");
    }

    event.target.value = "";
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
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="size-5" />
          Quản lý câu hỏi
          <Badge variant="secondary">{filteredQuestions.length} câu</Badge>
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedUnit} onValueChange={(v) => { setSelectedUnit(v); setSelectedLesson("all"); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Chọn chương" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chương</SelectItem>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  Chương {unit.order_index}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedLesson} onValueChange={setSelectedLesson}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Chọn bài" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả bài</SelectItem>
              {filteredLessons.map((lesson) => (
                <SelectItem key={lesson.id} value={lesson.id}>
                  {lesson.order_index + 1}. {lesson.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreateDialog} size="sm">
            <Plus className="mr-2 size-4" />
            Thêm câu hỏi
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 size-4" />
            Xuất Excel
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="mr-2 size-4" />
                Nhập Excel
              </span>
            </Button>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImport}
            />
          </label>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Chưa có câu hỏi nào. Nhấn "Thêm câu hỏi" để bắt đầu.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="min-w-[200px]">Câu hỏi</TableHead>
                  <TableHead className="w-28">Bài học</TableHead>
                  <TableHead className="w-24">Đáp án</TableHead>
                  <TableHead className="w-20">Trạng thái</TableHead>
                  <TableHead className="w-24 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((q, index) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <p className="line-clamp-2 max-w-xs">{q.question}</p>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p className="font-medium">{q.lessons?.title}</p>
                        <p className="text-muted-foreground">
                          Chương {q.lessons?.units?.order_index}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {String.fromCharCode(65 + q.correct_index)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {q.is_active ? (
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
                          onClick={() => openEditDialog(q)}
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
                              <AlertDialogTitle>Xóa câu hỏi?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc muốn xóa câu hỏi này? Hành động không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteQuestion(q.id)}
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

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? "Sửa câu hỏi" : "Thêm câu hỏi mới"}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Bài học</Label>
                  <Select
                    value={formData.lesson_id}
                    onValueChange={(value) => setFormData({ ...formData, lesson_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn bài học" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessons.map((lesson) => (
                        <SelectItem key={lesson.id} value={lesson.id}>
                          Chương {lesson.units?.order_index} - {lesson.order_index + 1}. {lesson.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Câu hỏi</Label>
                  <Textarea
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="Nhập câu hỏi"
                    rows={3}
                  />
                </div>
                <div className="space-y-3">
                  <Label>Đáp án (đánh dấu đáp án đúng)</Label>
                  {formData.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct"
                        checked={formData.correct_index === idx}
                        onChange={() => setFormData({ ...formData, correct_index: idx })}
                        className="size-4 accent-primary"
                      />
                      <span className="w-6 font-medium">{String.fromCharCode(65 + idx)}.</span>
                      <Input
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Đáp án ${String.fromCharCode(65 + idx)}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Giải thích (tùy chọn)</Label>
                  <Textarea
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    placeholder="Giải thích đáp án đúng"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Thứ tự</Label>
                    <Input
                      type="number"
                      value={formData.order_index}
                      onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>Hiển thị</Label>
                  </div>
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                <X className="mr-2 size-4" />
                Hủy
              </Button>
              <Button onClick={handleSubmit}>
                <Save className="mr-2 size-4" />
                {editingQuestion ? "Cập nhật" : "Tạo mới"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
