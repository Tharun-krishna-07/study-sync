import { supabase } from "@/integrations/supabase/client";
import { startOfWeek } from "@/lib/format";

export type GroupRow = {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  image_url: string | null;
  learning_goal: string | null;
  start_date: string | null;
  target_date: string | null;
  invite_code: string;
  owner_id: string;
};

export type MemberRow = {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: ProfileLite | null;
};

export type ProfileLite = {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  presence: string;
  total_xp: number;
};

export async function fetchMyGroups(userId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select("role, joined_at, groups(*)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? [])
    .filter((r) => r.groups)
    .map((r) => ({ ...(r.groups as unknown as GroupRow), myRole: r.role }));
}

export async function fetchGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select(
      "id, group_id, user_id, role, joined_at, profiles:profiles!inner(id, full_name, username, avatar_url, presence, total_xp)",
    )
    .eq("group_id", groupId)
    .order("joined_at");
  if (error) throw error;
  return (data ?? []) as unknown as MemberRow[];
}

export async function fetchLivePresence(groupIds: string[]) {
  if (groupIds.length === 0) return [];
  const { data, error } = await supabase
    .from("channel_presence")
    .select(
      "id, mode, group_id, channel_id, user_id, muted, camera_on, profiles:profiles!inner(id, full_name, avatar_url, presence)",
    )
    .in("group_id", groupIds);
  if (error) throw error;
  return data ?? [];
}

export async function awardXp(params: {
  userId: string;
  groupId?: string | null;
  amount: number;
  reason: string;
}) {
  const { error } = await supabase.from("xp_transactions").insert({
    user_id: params.userId,
    group_id: params.groupId ?? null,
    amount: params.amount,
    reason: params.reason,
  });
  if (error) throw error;
}

export async function fetchWeeklyXp(groupId?: string) {
  const since = startOfWeek().toISOString();
  let query = supabase
    .from("xp_transactions")
    .select("user_id, amount")
    .gte("created_at", since);
  if (groupId) query = query.eq("group_id", groupId);
  const { data, error } = await query;
  if (error) throw error;
  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + row.amount);
  }
  return totals;
}

export async function notify(userId: string, type: string, message: string, link?: string) {
  await supabase.from("notifications").insert({ user_id: userId, type, message, link: link ?? null });
}

export async function postSystemMessage(groupId: string, channelId: string | null, content: string) {
  await supabase
    .from("messages")
    .insert({ group_id: groupId, channel_id: channelId, content, is_system: true, user_id: null });
}

export function friendlyError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : "";
  if (/duplicate key/i.test(msg)) return "That already exists.";
  if (/row-level security|permission/i.test(msg))
    return "You don't have permission to do that.";
  if (/network|fetch failed/i.test(msg)) return "Network issue — please check your connection.";
  return fallback;
}

/** Updates the signed-in user's daily streak based on their last active day. */
export async function touchStreak(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("last_active_day, current_streak, longest_streak")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return;

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  if (data.last_active_day === todayKey) return;

  const yesterday = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10);
  const current = data.last_active_day === yesterday ? (data.current_streak ?? 0) + 1 : 1;
  const longest = Math.max(current, data.longest_streak ?? 0);

  await supabase
    .from("profiles")
    .update({ last_active_day: todayKey, current_streak: current, longest_streak: longest })
    .eq("id", userId);
}
