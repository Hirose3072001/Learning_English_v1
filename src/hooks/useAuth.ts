import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { ensureProfileAndBackfillXp } from "@/lib/profile";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    isAdmin: false,
  });

  useEffect(() => {
    const hydrateUser = async (user: User | null) => {
      let isAdmin = false;

      if (user) {
        // Ensure profile exists (and backfill XP for older accounts)
        try {
          await ensureProfileAndBackfillXp(user);
        } catch (e) {
          console.error("ensureProfileAndBackfillXp failed:", e);
        }

        // Check admin role
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        isAdmin = !!data;
      }

      return { isAdmin };
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      const { isAdmin } = await hydrateUser(user);

      setAuthState({
        session,
        user,
        loading: false,
        isAdmin,
      });
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      const { isAdmin } = await hydrateUser(user);

      setAuthState({
        session,
        user,
        loading: false,
        isAdmin,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return authState;
}
