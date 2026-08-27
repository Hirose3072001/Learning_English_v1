import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, ShieldOff, Trash2, Key } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  xp: number;
  created_at: string;
  isAdmin?: boolean;
}

interface AdminUsersProps {
  onUpdate: () => void;
}

export const AdminUsers = ({ onUpdate }: AdminUsersProps) => {
  const [resettingUser, setResettingUser] = useState<{ id: string, username: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const { data: users = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Check admin status for each user
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      return (profiles || []).map(p => ({
        ...p,
        isAdmin: adminUserIds.has(p.user_id),
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const toggleAdminRole = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (isCurrentlyAdmin) {
      // Remove admin role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) {
        toast.error("Lỗi xóa quyền admin");
        return;
      }
      toast.success("Đã xóa quyền admin");
    } else {
      // Add admin role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });

      if (error) {
        toast.error("Lỗi thêm quyền admin");
        return;
      }
      toast.success("Đã thêm quyền admin");
    }

    refetch();
    onUpdate();
  };

  const deleteUser = async (userId: string) => {
    // Note: This only deletes the profile, not the auth user
    // Full user deletion requires edge function with service role
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", userId);

    if (error) {
      toast.error("Lỗi xóa người dùng");
      return;
    }

    toast.success("Đã xóa hồ sơ người dùng");
    refetch();
    onUpdate();
  };

  const resetPassword = async () => {
    if (!resettingUser || !newPassword) return;

    setIsResetting(true);
    try {
      const { error } = await supabase.rpc('admin_reset_password', {
        target_user_id: resettingUser.id,
        new_password: newPassword
      });

      if (error) throw error;

      toast.success(`Đã đặt lại mật khẩu cho ${resettingUser.username}`);
      setResettingUser(null);
      setNewPassword("");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Lỗi khi đặt lại mật khẩu");
    } finally {
      setIsResetting(false);
    }
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Quản lý người dùng
          <Badge variant="secondary">{users.length} người</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên người dùng</TableHead>
                <TableHead>Tên hiển thị</TableHead>
                <TableHead>XP</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.display_name || "-"}</TableCell>
                  <TableCell>{user.xp}</TableCell>
                  <TableCell>
                    {user.isAdmin ? (
                      <Badge className="bg-primary">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAdminRole(user.user_id, !!user.isAdmin)}
                      >
                        {user.isAdmin ? (
                          <>
                            <ShieldOff className="mr-1 size-4" />
                            Xóa Admin
                          </>
                        ) : (
                          <>
                            <Shield className="mr-1 size-4" />
                            Thêm Admin
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setResettingUser({ id: user.user_id, username: user.username })}
                      >
                        <Key className="mr-1 size-4" />
                        Reset PW
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa người dùng?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc muốn xóa hồ sơ của {user.username}? Hành động này không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser(user.user_id)}
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

        <Dialog open={!!resettingUser} onOpenChange={(open) => !open && setResettingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Đặt lại mật khẩu</DialogTitle>
              <DialogDescription>
                Nhập mật khẩu mới cho người dùng <strong>{resettingUser?.username}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Mật khẩu mới</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResettingUser(null)}>
                Hủy
              </Button>
              <Button
                onClick={resetPassword}
                disabled={isResetting || newPassword.length < 6}
              >
                {isResetting ? "Đang xử lý..." : "Xác nhận"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
