import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

function usernameFromUser(user: User): string {
  const metaUsername = (user.user_metadata as { username?: string } | null)?.username;
  if (metaUsername && typeof metaUsername === "string" && metaUsername.trim().length > 0) {
    return metaUsername.trim();
  }

  const email = user.email ?? "";
  const fromEmail = email.includes("@") ? email.split("@")[0] : "";
  return (fromEmail || `user_${user.id.slice(0, 8)}`).toLowerCase();
}

function displayNameFromUser(user: User, fallbackUsername: string): string {
  const metaDisplay = (user.user_metadata as { display_name?: string; full_name?: string } | null);
  const display = metaDisplay?.display_name || metaDisplay?.full_name;
  if (display && typeof display === "string" && display.trim().length > 0) return display.trim();

  const email = user.email ?? "";
  const fromEmail = email.includes("@") ? email.split("@")[0] : "";
  return fromEmail || fallbackUsername;
}

export async function computeEarnedXp(userId: string): Promise<number> {
  const { data: progress, error: progressError } = await supabase
    .from("user_progress")
    .select("lesson_id")
    .eq("user_id", userId)
    .eq("completed", true);

  if (progressError) throw progressError;
  const lessonIds = Array.from(new Set((progress || []).map((p) => p.lesson_id).filter(Boolean)));
  if (lessonIds.length === 0) return 0;

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, xp_reward")
    .in("id", lessonIds);

  if (lessonsError) throw lessonsError;
  return (lessons || []).reduce((sum, l) => sum + (l.xp_reward ?? 0), 0);
}

/**
 * Checks if the user's streak has expired (more than 1 day since last_activity_date)
 * and if they do not have an active streak protection. If expired and unprotected,
 * resets streak_count to 0. Returns true if streak was reset.
 */
export async function checkAndResetStreak(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("streak_count, last_activity_date")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile || !profile.streak_count || profile.streak_count <= 0) {
      return false;
    }

    if (!profile.last_activity_date) {
      return false;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (profile.last_activity_date === todayStr) {
      return false; // Active today
    }

    const lastDate = new Date(profile.last_activity_date);
    const nowDate = new Date(todayStr);
    const timeDiff = nowDate.getTime() - lastDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    if (daysDiff <= 1) {
      return false; // Studied yesterday or today
    }

    // Streak is broken! Check if user has an active streak protection
    const { data: protections, error: protError } = await supabase
      .from("streak_protections" as any)
      .select("id")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (protError) {
      console.error("Error checking streak protections:", protError);
      return false;
    }

    if (protections && protections.length > 0) {
      // User is protected! Do not reset streak to 0.
      return false;
    }

    // No protection and gap > 1 day -> Reset streak to 0
    const { error: resetError } = await supabase
      .from("profiles")
      .update({ streak_count: 0 })
      .eq("user_id", userId);

    if (resetError) {
      console.error("Error resetting streak:", resetError);
      return false;
    }

    return true;
  } catch (err) {
    console.error("checkAndResetStreak error:", err);
    return false;
  }
}

/**
 * Ensures the current user has a profiles row. If missing, create it.
 * Also backfills XP based on completed lessons (useful for older accounts).
 */
export async function ensureProfileAndBackfillXp(user: User) {
  await checkAndResetStreak(user.id);

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("user_id, xp")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) throw existingError;

  const computedXp = await computeEarnedXp(user.id);

  if (!existing) {
    const username = usernameFromUser(user);
    const display_name = displayNameFromUser(user, username);

    const { error: insertError } = await supabase.from("profiles").insert({
      user_id: user.id,
      username,
      display_name,
      xp: computedXp,
    });

    if (insertError) throw insertError;
    return;
  }

  // If XP in profile is lower than what user already earned, backfill it.
  if ((existing.xp ?? 0) < computedXp) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ xp: computedXp })
      .eq("user_id", user.id);

    if (updateError) throw updateError;
  }
}

