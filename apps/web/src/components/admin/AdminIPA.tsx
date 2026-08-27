import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIPASpeech } from "@/hooks/useIPASpeech";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Trash2, Edit, Plus, Volume2 } from "lucide-react";
import { toast } from "sonner";

interface Character {
  id: string;
  letter: string;
  type: 'vowel' | 'consonant';
  pronunciation: string;
  example: string;
  sound: string;
  order_index: number;
  is_active: boolean;
}

const AdminIPA = () => {
  const { speak } = useIPASpeech();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [formData, setFormData] = useState({
    letter: "",
    type: "vowel" as 'vowel' | 'consonant',
    pronunciation: "",
    example: "",
    sound: "",
  });

  // Fetch all characters (including inactive)
  const { data: characters, refetch } = useQuery({
    queryKey: ['admin-characters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .order('order_index');
      
      if (error) throw error;
      return (data || []) as Character[];
    }
  });

  // Add character mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = characters?.reduce((max, char) => Math.max(max, char.order_index || 0), 0) || 0;
      
      const { error } = await supabase
        .from('characters')
        .insert({
          ...formData,
          order_index: maxOrder + 1,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã thêm ký tự mới!");
      refetch();
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error adding character:', error);
      toast.error("Có lỗi xảy ra khi thêm ký tự!");
    }
  });

  // Update character mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingCharacter) return;

      const { error } = await supabase
        .from('characters')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCharacter.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã cập nhật ký tự!");
      refetch();
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error updating character:', error);
      toast.error("Có lỗi xảy ra khi cập nhật ký tự!");
    }
  });

  // Delete character mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã xóa ký tự!");
      refetch();
    },
    onError: (error) => {
      console.error('Error deleting character:', error);
      toast.error("Có lỗi xảy ra khi xóa ký tự!");
    }
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async (character: Character) => {
      const { error } = await supabase
        .from('characters')
        .update({ is_active: !character.is_active })
        .eq('id', character.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái!");
      refetch();
    },
    onError: (error) => {
      console.error('Error toggling character:', error);
      toast.error("Có lỗi xảy ra!");
    }
  });

  const resetForm = () => {
    setFormData({
      letter: "",
      type: "vowel",
      pronunciation: "",
      example: "",
      sound: "",
    });
    setEditingCharacter(null);
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (character: Character) => {
    setEditingCharacter(character);
    setFormData({
      letter: character.letter,
      type: character.type,
      pronunciation: character.pronunciation,
      example: character.example,
      sound: character.sound,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveAdd = () => {
    if (!formData.letter.trim() || !formData.example.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin!");
      return;
    }
    addMutation.mutate();
  };

  const handleSaveEdit = () => {
    if (!formData.letter.trim() || !formData.example.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin!");
      return;
    }
    updateMutation.mutate();
  };

  const vowels = characters?.filter(char => char.type === 'vowel') || [];
  const consonants = characters?.filter(char => char.type === 'consonant') || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Quản lý Bảng chữ cái IPA</h2>
        <Button onClick={handleOpenAddDialog} className="gap-2">
          <Plus className="size-4" />
          Thêm ký tự mới
        </Button>
      </div>

      {/* Vowels Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-red-600">Nguyên âm ({vowels.length})</h3>
        <div className="grid gap-3">
          {vowels.map((char) => (
            <Card
              key={char.id}
              className={`p-4 flex items-center justify-between ${
                !char.is_active ? "opacity-50 bg-muted" : ""
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className="text-2xl font-bold font-mono"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {char.letter}
                  </span>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {char.pronunciation}
                    </p>
                    <p className="font-medium">{char.example}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={char.is_active ? "outline" : "secondary"}
                  size="sm"
                  onClick={() => toggleActiveMutation.mutate(char)}
                >
                  {char.is_active ? "Ẩn" : "Hiện"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => speak(char.letter)}
                  title="Phát âm"
                >
                  <Volume2 className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEditDialog(char)}
                >
                  <Edit className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(char.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Consonants Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-blue-600">Phụ âm ({consonants.length})</h3>
        <div className="grid gap-3">
          {consonants.map((char) => (
            <Card
              key={char.id}
              className={`p-4 flex items-center justify-between ${
                !char.is_active ? "opacity-50 bg-muted" : ""
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className="text-2xl font-bold font-mono"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {char.letter}
                  </span>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {char.pronunciation}
                    </p>
                    <p className="font-medium">{char.example}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={char.is_active ? "outline" : "secondary"}
                  size="sm"
                  onClick={() => toggleActiveMutation.mutate(char)}
                >
                  {char.is_active ? "Ẩn" : "Hiện"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => speak(char.letter)}
                  title="Phát âm"
                >
                  <Volume2 className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEditDialog(char)}
                >
                  <Edit className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(char.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm ký tự mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ký tự IPA</label>
              <Input
                value={formData.letter}
                onChange={(e) => setFormData({ ...formData, letter: e.target.value })}
                placeholder="/i:/"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Loại</label>
              <Select value={formData.type} onValueChange={(value) => 
                setFormData({ ...formData, type: value as 'vowel' | 'consonant' })
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vowel">Nguyên âm</SelectItem>
                  <SelectItem value="consonant">Phụ âm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Phát âm (để trống nếu giống ký tự)</label>
              <Input
                value={formData.pronunciation}
                onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                placeholder="/i:/"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Từ ví dụ</label>
              <Input
                value={formData.example}
                onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                placeholder="eat"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Âm thanh (URL hoặc định dạng âm thanh)</label>
              <Input
                value={formData.sound}
                onChange={(e) => setFormData({ ...formData, sound: e.target.value })}
                placeholder="https://example.com/sound.mp3"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSaveAdd} disabled={addMutation.isPending}>
                Thêm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa ký tự: {editingCharacter?.letter}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ký tự IPA</label>
              <Input
                value={formData.letter}
                onChange={(e) => setFormData({ ...formData, letter: e.target.value })}
                placeholder="/i:/"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Loại</label>
              <Select value={formData.type} onValueChange={(value) => 
                setFormData({ ...formData, type: value as 'vowel' | 'consonant' })
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vowel">Nguyên âm</SelectItem>
                  <SelectItem value="consonant">Phụ âm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Phát âm (để trống nếu giống ký tự)</label>
              <Input
                value={formData.pronunciation}
                onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                placeholder="/i:/"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Từ ví dụ</label>
              <Input
                value={formData.example}
                onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                placeholder="eat"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Âm thanh (URL hoặc định dạng âm thanh)</label>
              <Input
                value={formData.sound}
                onChange={(e) => setFormData({ ...formData, sound: e.target.value })}
                placeholder="https://example.com/sound.mp3"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminIPA;
