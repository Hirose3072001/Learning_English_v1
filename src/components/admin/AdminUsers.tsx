import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, ShieldOff, Trash2 } from "lucide-react";
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
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Lỗi tải danh sách người dùng");
      setLoading(false);
      return;
    }

    // Check admin status for each user
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

    const usersWithRoles = (profiles || []).map(p => ({
      ...p,
      isAdmin: adminUserIds.has(p.user_id),
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

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

    fetchUsers();
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
    fetchUsers();
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Quản lý người dùng
          <Badge variant="secondary">{users.length} người</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
};
