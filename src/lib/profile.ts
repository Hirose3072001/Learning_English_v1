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
 * Ensures the current user has a profiles row. If missing, create it.
 * Also backfills XP based on completed lessons (useful for older accounts).
 */
export async function ensureProfileAndBackfillXp(user: User) {
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
