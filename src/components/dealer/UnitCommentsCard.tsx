import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquarePlus, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface UnitComment {
  id: string;
  unit_id: string;
  dealer_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
}

interface Props {
  unitId: string;
  dealerId: string;
}

export default function UnitCommentsCard({ unitId, dealerId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["unit-comments", unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_comments" as any)
        .select("*, profiles:user_id(full_name, email)")
        .eq("unit_id", unitId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[] as UnitComment[];
    },
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from("unit_comments" as any).insert({
        unit_id: unitId,
        dealer_id: dealerId,
        user_id: user!.id,
        comment: text,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-comments", unitId] });
      queryClient.invalidateQueries({ queryKey: ["unit-activity-logs", unitId] });
      setNewComment("");
      toast({ title: "Comment added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    addComment.mutate(trimmed);
  };

  return (
    <Card className="glass-panel border-border">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Comments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input */}
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment…"
            className="min-h-[80px] text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button
              variant="hero"
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || addComment.isPending}
              className="gap-1.5"
            >
              {addComment.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MessageSquarePlus className="h-3.5 w-3.5" />
              )}
              Add Comment
            </Button>
          </div>
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-0">
            {comments.map((c, i) => {
              const profile = c.profiles as any;
              const name = profile?.full_name || profile?.email || "Unknown";
              return (
                <div
                  key={c.id}
                  className={`relative pl-6 pb-4 ${
                    i < comments.length - 1 ? "border-l border-border/50 ml-2" : "ml-2"
                  }`}
                >
                  {/* Dot */}
                  <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-primary/60 border-2 border-background" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(c.created_at), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{c.comment}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No comments yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
