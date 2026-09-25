import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Lock,
  User,
  ChevronRight,
  Pencil,
  X,
  KeyRound,
  Chrome,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type View = "menu" | "profile" | "password";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>("menu");
  const [isEditing, setIsEditing] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password fields
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const isGoogleUser =
    user?.app_metadata?.provider === "google" ||
    (user?.app_metadata?.providers ?? []).includes("google");

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setDisplayName(data.display_name || "");
            setUsername(data.username || "");
            setAvatarUrl(data.avatar_url || "");
          }
        });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, username, avatar_url: avatarUrl })
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Cập nhật thành công", description: "Thông tin đã được lưu." });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setIsEditing(false);
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!oldPassword) {
      toast({ title: "Lỗi", description: "Vui lòng nhập mật khẩu cũ.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Lỗi", description: "Mật khẩu mới phải có ít nhất 6 ký tự.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Lỗi", description: "Mật khẩu xác nhận không khớp.", variant: "destructive" });
      return;
    }

    setIsSavingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: oldPassword,
      });
      if (signInError) throw new Error("Mật khẩu cũ không chính xác.");

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      toast({ title: "Thành công", description: "Mật khẩu đã được thay đổi." });
      setOldPassword(""); setPassword(""); setConfirmPassword("");
      setView("menu");
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // ─── Menu View ────────────────────────────────────────────────
  if (view === "menu") {
    return (
      <div className="container max-w-xl mx-auto py-10 px-4">
        <Button
          variant="ghost"
          className="-ml-4 mb-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 size-5" /> Quay lại
        </Button>

        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Cài đặt</h1>
        <p className="text-muted-foreground mb-8">Quản lý tài khoản của bạn</p>

        <div className="space-y-3">
          <button
            onClick={() => { setView("profile"); setIsEditing(false); }}
            className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="size-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-bold text-base">Thông tin cá nhân</p>
                <p className="text-sm text-muted-foreground">Xem và chỉnh sửa thông tin hồ sơ</p>
              </div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>

          <button
            onClick={() => setView("password")}
            className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-border bg-card hover:border-red-300 hover:bg-red-50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-red-50 flex items-center justify-center">
                <Lock className="size-6 text-red-500" />
              </div>
              <div className="text-left">
                <p className="font-bold text-base">Đổi mật khẩu</p>
                <p className="text-sm text-muted-foreground">Cập nhật mật khẩu đăng nhập</p>
              </div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Profile View ─────────────────────────────────────────────
  if (view === "profile") {
    return (
      <div className="container max-w-xl mx-auto py-10 px-4">
        <Button
          variant="ghost"
          className="-ml-4 mb-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
          onClick={() => { setView("menu"); setIsEditing(false); }}
        >
          <ArrowLeft className="mr-2 size-5" /> Quay lại
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Thông tin cá nhân</h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? "Chỉnh sửa thông tin của bạn" : "Thông tin hồ sơ của bạn"}
            </p>
          </div>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="icon"
              className="size-10 rounded-full border-2"
            >
              <Pencil className="size-4" />
            </Button>
          )}
        </div>

        {/* Avatar preview */}
        <div className="flex justify-center mb-8">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="size-24 rounded-full object-cover border-4 border-primary/20 shadow-md"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
              <User className="size-10 text-primary" />
            </div>
          )}
        </div>

        <div className="space-y-5">
          {/* Email – always read-only */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Email</Label>
            <p className="px-4 py-3 rounded-xl bg-muted text-sm font-medium text-muted-foreground">
              {user?.email}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
              Tên hiển thị
            </Label>
            {isEditing ? (
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="VD: Người học mới"
                className="focus-visible:ring-primary border-2"
              />
            ) : (
              <p className="px-4 py-3 rounded-xl border-2 border-border text-sm font-medium">
                {displayName || <span className="text-muted-foreground italic">Chưa đặt</span>}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username" className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
              Tên đăng nhập
            </Label>
            {isEditing ? (
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="VD: new_learner_123"
                className="focus-visible:ring-primary border-2"
              />
            ) : (
              <p className="px-4 py-3 rounded-xl border-2 border-border text-sm font-medium">
                {username || <span className="text-muted-foreground italic">Chưa đặt</span>}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="avatarUrl" className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
              URL ảnh đại diện
            </Label>
            {isEditing ? (
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="focus-visible:ring-primary border-2"
              />
            ) : (
              <p className="px-4 py-3 rounded-xl border-2 border-border text-sm font-medium truncate">
                {avatarUrl || <span className="text-muted-foreground italic">Chưa có ảnh</span>}
              </p>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                size="lg"
                className="flex-1 font-bold"
              >
                {isSavingProfile ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                ) : (
                  <Save className="size-5 mr-2" />
                )}
                Lưu thay đổi
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsEditing(false)}
                disabled={isSavingProfile}
                className="flex-1 border-2"
              >
                <X className="size-5 mr-2" /> Hủy
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Password View ────────────────────────────────────────────
  if (view === "password") {
    return (
      <div className="container max-w-xl mx-auto py-10 px-4">
        <Button
          variant="ghost"
          className="-ml-4 mb-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
          onClick={() => setView("menu")}
        >
          <ArrowLeft className="mr-2 size-5" /> Quay lại
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Đổi mật khẩu</h1>
          <p className="text-muted-foreground mt-1">Cập nhật mật khẩu đăng nhập của bạn</p>
        </div>

        {isGoogleUser ? (
          <div className="flex flex-col items-center justify-center gap-5 py-12 px-6 rounded-2xl border-2 border-dashed border-border bg-muted/40">
            <div className="size-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Chrome className="size-8 text-blue-500" />
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">Đăng nhập bằng Google</p>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                Tài khoản của bạn đang được đăng nhập thông qua Google.
                Bạn không cần và không thể đặt mật khẩu riêng cho tài khoản này.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 text-sm font-medium">
              <Info className="size-4 shrink-0" />
              Quản lý mật khẩu tại tài khoản Google của bạn
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="oldPassword" className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Mật khẩu hiện tại
              </Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
                className="border-2 focus-visible:ring-red-400"
              />
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Mật khẩu mới
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="border-2 focus-visible:ring-red-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Xác nhận mật khẩu mới
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="border-2 focus-visible:ring-red-400"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive font-medium">Mật khẩu không khớp</p>
              )}
            </div>

            <Button
              onClick={handleSavePassword}
              disabled={isSavingPassword || !oldPassword || !password || !confirmPassword}
              size="lg"
              variant="destructive"
              className="w-full font-bold mt-2"
            >
              {isSavingPassword ? (
                <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
              ) : (
                <KeyRound className="size-5 mr-2" />
              )}
              Cập nhật mật khẩu
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default Settings;
