import { Flame, Gem, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const TopBar = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("streak_count, gems, hearts")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds to reduce refetching
  });

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b-2 border-border bg-card">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        {/* Streak */}
        <div className="flex items-center gap-1.5">
          <Flame className="size-6 text-warning" fill="currentColor" />
          <span className="text-lg font-bold text-warning">{profile?.streak_count ?? 0}</span>
        </div>

        {/* Gems */}
        <div className="flex items-center gap-1.5">
          <Gem className="size-6 text-secondary" fill="currentColor" />
          <span className="text-lg font-bold text-secondary">{profile?.gems ?? 100}</span>
        </div>

        {/* Hearts */}
        <div className="flex items-center gap-1.5">
          <Heart className="size-6 text-destructive" fill="currentColor" />
          <span className="text-lg font-bold text-destructive">{profile?.hearts ?? 5}</span>
        </div>
      </div>
    </header>
  );
};
