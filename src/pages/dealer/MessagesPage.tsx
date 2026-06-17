import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrentDealer, useDealerMembers, useDealerUnits } from "@/hooks/useDealerData";
import {
  listChannels, createChannel, openDm, listMessages, sendMessage, channelTitle, markChannelRead,
  type ChatChannel, type ChatMessage,
} from "@/lib/chat";
import {
  MessageSquare, Plus, Send, ArrowLeft, Hash, Users, AtSign, Car, X, Loader2,
} from "lucide-react";
import { format } from "date-fns";

type Member = { user_id: string; profiles?: { full_name?: string | null; email?: string | null } };

export default function MessagesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: membership } = useCurrentDealer();
  const dealerId = membership?.dealer_id;
  const selfId = membership?.user_id ? Number(membership.user_id) : null;
  const { data: members } = useDealerMembers(dealerId);
  const { data: units } = useDealerUnits(dealerId);

  const [activeId, setActiveId] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const channelsQ = useQuery({
    queryKey: ["chat-channels", dealerId],
    queryFn: listChannels,
    enabled: !!dealerId,
    refetchInterval: 10000,
  });
  const channels = channelsQ.data?.channels ?? [];
  const available = channelsQ.data?.available ?? true;

  const memberName = (id: number) => (members as Member[] | undefined)?.find((m) => Number(m.user_id) === id)?.profiles?.full_name || `User ${id}`;

  const openChannel = async (id: number) => {
    setActiveId(id);
    try { await markChannelRead(id); } catch { /* best-effort */ }
    qc.invalidateQueries({ queryKey: ["chat-channels", dealerId] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  if (!available) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <MessageSquare className="h-8 w-8 mb-3 opacity-50" />
        <p className="text-sm font-medium text-foreground">Team messaging is being set up</p>
        <p className="text-xs mt-1 max-w-xs">Chat will come online once your workspace finishes provisioning. Check back shortly.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-foreground">Messages</h1>
        <Button size="sm" variant="hero" className="gap-1.5" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3">
        {/* Channel list — hidden on mobile when a thread is open */}
        <Card className={`glass-panel border-border overflow-y-auto ${activeId ? "hidden md:block" : "block"}`}>
          {channels.length === 0 && (
            <p className="p-4 text-xs text-muted-foreground">No conversations yet. Tap “New” to start one.</p>
          )}
          {channels.map((c) => (
            <button
              key={c.id}
              onClick={() => openChannel(c.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/40 hover:bg-muted/40 transition-colors ${activeId === c.id ? "bg-muted/50" : ""}`}
            >
              <div className="flex items-center gap-2">
                {c.kind === "dm" ? <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <span className={`text-sm truncate flex-1 ${c.unread ? "font-bold text-foreground" : "font-medium text-foreground"}`}>{channelTitle(c, selfId)}</span>
                {!!c.unread && c.unread > 0 && activeId !== c.id && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                    {c.unread > 99 ? "99+" : c.unread}
                  </span>
                )}
              </div>
              {c.last_message && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5 pl-5.5">{c.last_message.body}</p>
              )}
            </button>
          ))}
        </Card>

        {/* Thread */}
        <div className={`min-h-0 ${activeId ? "block" : "hidden md:block"}`}>
          {activeId ? (
            <Thread
              channelId={activeId}
              channel={channels.find((c) => c.id === activeId)}
              selfId={selfId}
              members={(members as Member[]) || []}
              units={units || []}
              memberName={memberName}
              onBack={() => setActiveId(null)}
              onSent={() => qc.invalidateQueries({ queryKey: ["chat-channels", dealerId] })}
            />
          ) : (
            <div className="hidden md:flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a conversation
            </div>
          )}
        </div>
      </div>

      {newOpen && (
        <NewConversationDialog
          open={newOpen}
          onClose={() => setNewOpen(false)}
          members={((members as Member[]) || []).filter((m) => Number(m.user_id) !== selfId)}
          onCreated={(id) => { setNewOpen(false); setActiveId(id); qc.invalidateQueries({ queryKey: ["chat-channels", dealerId] }); }}
          toastErr={(msg) => toast({ title: "Error", description: msg, variant: "destructive" })}
        />
      )}
    </div>
  );
}

function Thread({ channelId, channel, selfId, members, units, memberName, onBack, onSent }: {
  channelId: number; channel?: ChatChannel; selfId: number | null;
  members: Member[]; units: any[]; memberName: (id: number) => string;
  onBack: () => void; onSent: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [mentionIds, setMentionIds] = useState<number[]>([]);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const messagesQ = useQuery({
    queryKey: ["chat-messages", channelId],
    queryFn: () => listMessages(channelId),
    refetchInterval: 6000,
  });
  const messages = messagesQ.data ?? [];

  // Keep the channel marked read while it's open (clears the bell/unread badge).
  const lastMsgId = messages.length ? messages[messages.length - 1].id : 0;
  useEffect(() => {
    if (!channelId) return;
    markChannelRead(channelId)
      .then(() => {
        qc.invalidateQueries({ queryKey: ["chat-channels"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .catch(() => { /* best-effort */ });
  }, [channelId, lastMsgId, qc]);

  const onTextChange = (v: string) => {
    setText(v);
    setMentionOpen(/@(\w*)$/.test(v));
  };

  const insertMention = (m: Member) => {
    const name = m.profiles?.full_name || m.profiles?.email || `User ${m.user_id}`;
    setText((prev) => prev.replace(/@(\w*)$/, `@${name} `));
    setMentionIds((prev) => Array.from(new Set([...prev, Number(m.user_id)])));
    setMentionOpen(false);
    taRef.current?.focus();
  };

  const unitLabel = (u: any) => `${u.stock_number ? `#${u.stock_number} · ` : ""}${[u.year, u.make, u.model].filter(Boolean).join(" ") || u.vin || "Unit"}`;
  const attachedUnit = units.find((u) => Number(u.id) === unitId);

  const handleSend = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await sendMessage(channelId, { body, unit_id: unitId, mentions: mentionIds });
      setText(""); setMentionIds([]); setUnitId(null);
      await messagesQ.refetch();
      onSent();
    } catch (e: any) {
      toast({ title: "Couldn't send", description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <Card className="glass-panel border-border h-full flex flex-col">
      {/* Thread header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Button variant="ghost" size="sm" className="md:hidden h-8 w-8 p-0" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <span className="text-sm font-semibold text-foreground truncate">{channel ? channelTitle(channel, selfId) : "Conversation"}</span>
        {channel && channel.kind !== "dm" && <Badge variant="outline" className="text-[10px]">{channel.members.length} members</Badge>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messagesQ.isLoading && <p className="text-xs text-muted-foreground text-center">Loading messages…</p>}
        {!messagesQ.isLoading && messages.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Say hello 👋</p>}
        {messages.map((m: ChatMessage) => {
          const mine = m.sender_id === selfId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {!mine && <p className="text-[10px] font-semibold opacity-70 mb-0.5">{m.sender_name || memberName(m.sender_id || 0)}</p>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                {m.unit_id && (
                  <a href={`/dealer/units/${m.unit_id}`} className={`mt-1.5 flex items-center gap-1 text-[11px] rounded border px-1.5 py-1 ${mine ? "border-primary-foreground/30" : "border-border"}`}>
                    <Car className="h-3 w-3" /> {m.stock_number ? `#${m.stock_number} · ` : ""}{[m.year, m.make, m.model].filter(Boolean).join(" ") || m.vin}
                  </a>
                )}
              </div>
              <span className="text-[9px] text-muted-foreground mt-0.5">{(() => { const d = new Date(m.created_at); return isNaN(d.getTime()) ? "" : format(d, "MMM d, h:mm a"); })()}</span>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-2 space-y-2 relative">
        {attachedUnit && (
          <div className="flex items-center gap-1.5 text-[11px] bg-muted/50 rounded px-2 py-1 w-fit">
            <Car className="h-3 w-3" /> {unitLabel(attachedUnit)}
            <button onClick={() => setUnitId(null)}><X className="h-3 w-3" /></button>
          </div>
        )}
        {mentionOpen && members.length > 0 && (
          <div className="absolute bottom-full left-2 mb-1 w-56 max-h-40 overflow-y-auto bg-popover border border-border rounded-md shadow-lg z-10">
            {members.filter((m) => Number(m.user_id) !== selfId).map((m) => (
              <button key={m.user_id} onClick={() => insertMention(m)} className="w-full text-left px-3 py-2 text-xs hover:bg-muted">
                {m.profiles?.full_name || m.profiles?.email}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message…  @ to mention"
            rows={1}
            className="flex-1 text-sm rounded-md border border-border bg-background p-2 resize-none min-h-[44px] max-h-32"
          />
          <Button variant="outline" size="sm" className="h-11 w-11 p-0 shrink-0" title="Mention" onClick={() => { setText((t) => t + "@"); setMentionOpen(true); taRef.current?.focus(); }}>
            <AtSign className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-11 w-11 p-0 shrink-0" title="Attach unit" onClick={() => setUnitOpen(true)}>
            <Car className="h-4 w-4" />
          </Button>
          <Button size="sm" className="h-11 w-11 p-0 shrink-0" onClick={handleSend} disabled={sending || !text.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Unit picker */}
      <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
        <DialogContent className="sm:max-w-sm max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Attach a unit</DialogTitle></DialogHeader>
          <div className="space-y-1">
            {units.length === 0 && <p className="text-xs text-muted-foreground">No units available.</p>}
            {units.map((u) => (
              <button key={u.id} onClick={() => { setUnitId(Number(u.id)); setUnitOpen(false); }}
                className="w-full text-left px-3 py-2.5 rounded-md hover:bg-muted text-sm min-h-[44px]">
                {unitLabel(u)}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function NewConversationDialog({ open, onClose, members, onCreated, toastErr }: {
  open: boolean; onClose: () => void; members: Member[];
  onCreated: (id: number) => void; toastErr: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const toggle = (id: number) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const create = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      if (selected.length === 1 && !name.trim()) {
        const { id } = await openDm(selected[0]);
        onCreated(id);
      } else {
        const c = await createChannel({ name: name.trim() || undefined, kind: "group", member_ids: selected });
        onCreated(c.id);
      }
    } catch (e: any) { toastErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New conversation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Group name (optional — leave blank for a direct message)</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Front Line" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Members</label>
            <div className="max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border/40">
              {members.length === 0 && <p className="p-3 text-xs text-muted-foreground">No other users in your dealer yet.</p>}
              {members.map((m) => (
                <label key={m.user_id} className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/40 min-h-[44px]">
                  <input type="checkbox" checked={selected.includes(Number(m.user_id))} onChange={() => toggle(Number(m.user_id))} className="h-4 w-4 accent-primary" />
                  <span className="text-sm">{m.profiles?.full_name || m.profiles?.email}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button size="sm" onClick={create} disabled={busy || selected.length === 0}>
            {busy ? "Creating…" : selected.length === 1 && !name.trim() ? "Start DM" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
