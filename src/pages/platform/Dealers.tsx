import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDealers } from "@/hooks/usePlatformData";
import { useCreateDealer, useSuspendDealer } from "@/hooks/usePlatformActions";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Dealers() {
  const { data: dealers, isLoading } = useDealers();
  const createDealer = useCreateDealer();
  const suspendDealer = useSuspendDealer();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [showCreds, setShowCreds] = useState<{ email: string; username: string; password: string } | null>(null);
  const [form, setForm] = useState({ dealer_name: "", admin_email: "", admin_username: "", admin_full_name: "", temp_password: "" });

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const handleCreate = async () => {
    const password = form.temp_password || generatePassword();
    try {
      await createDealer.mutateAsync({ ...form, temp_password: password });
      setShowCreate(false);
      setShowCreds({ email: form.admin_email, username: form.admin_username, password });
      setForm({ dealer_name: "", admin_email: "", admin_username: "", admin_full_name: "", temp_password: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSuspend = async (dealerId: string, suspend: boolean) => {
    try {
      await suspendDealer.mutateAsync({ dealer_id: dealerId, suspend });
      toast({ title: suspend ? "Dealer suspended" : "Dealer unsuspended" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dealerships</h1>
          <p className="text-muted-foreground mt-1">Manage all dealerships</p>
        </div>
        <Button variant="hero" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Dealership
        </Button>
      </div>

      <Card className="glass-panel border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {dealers?.map((d) => (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => navigate(`/platform/dealers/${d.id}`)}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>
                    <Badge variant={d.is_active ? "default" : "destructive"} className={d.is_active ? "bg-primary/20 text-primary border-primary/30" : ""}>
                      {d.is_active ? "Active" : "Suspended"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(d.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleSuspend(d.id, d.is_active); }}
                    >
                      {d.is_active ? "Suspend" : "Unsuspend"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && !dealers?.length && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No dealerships yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-panel-strong">
          <DialogHeader>
            <DialogTitle>Create Dealership</DialogTitle>
            <DialogDescription>Create a new dealership with an initial admin user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Dealer Name *</label>
              <Input value={form.dealer_name} onChange={(e) => setForm({ ...form, dealer_name: e.target.value })} placeholder="ABC Motors" />
            </div>
            <div>
              <label className="text-sm font-medium">Admin Email *</label>
              <Input value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} placeholder="admin@abcmotors.com" />
            </div>
            <div>
              <label className="text-sm font-medium">Admin Username *</label>
              <Input value={form.admin_username} onChange={(e) => setForm({ ...form, admin_username: e.target.value })} placeholder="abc_admin" />
              <p className="text-xs text-muted-foreground mt-1">Unique login identifier (letters, numbers, dots, hyphens, underscores)</p>
            </div>
            <div>
              <label className="text-sm font-medium">Admin Full Name</label>
              <Input value={form.admin_full_name} onChange={(e) => setForm({ ...form, admin_full_name: e.target.value })} placeholder="John Smith" />
            </div>
            <div>
              <label className="text-sm font-medium">Temp Password (auto-generated if empty)</label>
              <Input value={form.temp_password} onChange={(e) => setForm({ ...form, temp_password: e.target.value })} placeholder="Leave blank to auto-generate" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              variant="hero"
              onClick={handleCreate}
              disabled={!form.dealer_name || !form.admin_email || !form.admin_username || createDealer.isPending}
            >
              {createDealer.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog open={!!showCreds} onOpenChange={() => setShowCreds(null)}>
        <DialogContent className="glass-panel-strong">
          <DialogHeader>
            <DialogTitle>Dealership Created ✓</DialogTitle>
            <DialogDescription>Save these credentials — they won't be shown again. The admin should change their password after first login.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 bg-muted/50 rounded-lg p-4 font-mono text-sm">
            <div><span className="text-muted-foreground">Username:</span> {showCreds?.username}</div>
            <div><span className="text-muted-foreground">Email:</span> {showCreds?.email}</div>
            <div><span className="text-muted-foreground">Temp Password:</span> {showCreds?.password}</div>
          </div>
          <DialogFooter>
            <Button
              variant="hero"
              onClick={() => {
                navigator.clipboard.writeText(`Username: ${showCreds?.username}\nEmail: ${showCreds?.email}\nTemp Password: ${showCreds?.password}`);
                toast({ title: "Copied to clipboard" });
              }}
            >
              Copy Credentials
            </Button>
            <Button variant="ghost" onClick={() => setShowCreds(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
