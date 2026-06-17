/**
 * Dealer chat client. Talks to MC chat endpoints (apiFetch only):
 *   GET  /api/v1/reconverse/chat/channels
 *   POST /api/v1/reconverse/chat/channels      { name, kind, member_ids[] }
 *   POST /api/v1/reconverse/chat/dm            { user_id }
 *   GET  /api/v1/reconverse/chat/channels/:id/messages
 *   POST /api/v1/reconverse/chat/channels/:id/messages  { body, unit_id?, mentions[] }
 *
 * If the endpoints aren't live yet (pre MC restart) the calls return a
 * `available:false` signal so the UI can show a clean "coming online" state
 * instead of erroring.
 */
import { apiFetch } from "@/lib/api";

export type ChannelKind = "channel" | "group" | "dm";

export interface ChatMember { id: number; name: string | null; }
export interface ChatChannel {
  id: number;
  name: string | null;
  kind: ChannelKind;
  created_at: string;
  last_message?: { body: string; created_at: string; sender_id: number | null } | null;
  members: ChatMember[];
}
export interface ChatMessage {
  id: number;
  channel_id: number;
  sender_id: number | null;
  sender_name: string | null;
  body: string;
  unit_id: number | null;
  mentions: number[];
  created_at: string;
  stock_number?: string | null;
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
}

const BASE = "/api/v1/reconverse/chat";

async function call(path: string, init?: RequestInit): Promise<{ ok: boolean; available: boolean; data: any; error?: string }> {
  try {
    const res = await apiFetch(`${BASE}${path}`, init);
    if (res.status === 404) return { ok: false, available: false, data: null, error: "not_found" };
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) return { ok: false, available: true, data: null, error: j?.error || `http_${res.status}` };
    return { ok: true, available: true, data: j.data };
  } catch {
    return { ok: false, available: false, data: null, error: "unreachable" };
  }
}

export async function listChannels(): Promise<{ channels: ChatChannel[]; available: boolean }> {
  const r = await call("/channels");
  return { channels: (r.data as ChatChannel[]) || [], available: r.available };
}

export async function createChannel(payload: { name?: string; kind: ChannelKind; member_ids: number[] }): Promise<ChatChannel> {
  const r = await call("/channels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(r.error || "create_failed");
  return r.data as ChatChannel;
}

export async function openDm(userId: number): Promise<{ id: number }> {
  const r = await call("/dm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId }) });
  if (!r.ok) throw new Error(r.error || "dm_failed");
  return r.data as { id: number };
}

export async function listMessages(channelId: number): Promise<ChatMessage[]> {
  const r = await call(`/channels/${channelId}/messages`);
  if (!r.ok) return [];
  return (r.data as ChatMessage[]) || [];
}

export async function sendMessage(channelId: number, payload: { body: string; unit_id?: number | null; mentions?: number[] }): Promise<void> {
  const r = await call(`/channels/${channelId}/messages`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: payload.body, unit_id: payload.unit_id ?? null, mentions: payload.mentions ?? [] }),
  });
  if (!r.ok) throw new Error(r.error || "send_failed");
}

/** Friendly title for a channel (DMs show the other member's name). */
export function channelTitle(c: ChatChannel, selfId?: number | null): string {
  if (c.kind === "dm") {
    const other = c.members.find((m) => m.id !== selfId) || c.members[0];
    return other?.name || "Direct message";
  }
  return c.name || (c.kind === "channel" ? "Channel" : "Group");
}
