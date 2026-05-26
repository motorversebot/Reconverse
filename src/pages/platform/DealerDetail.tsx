import { useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDealerDetail, useDealerMemberships, useUnits } from "@/hooks/usePlatformData";
import { useCreateDealerUser, useResetPassword, useSuspendDealer } from "@/hooks/usePlatformActions";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Plus, KeyRound } from "lucide-react";

export default function DealerDetail() {
  const { dealerId } = useParams<{ dealerId: string }>();
  const { data: dealer } = useDealerDetail(dealerId!);
  const { data: memberships } = useDealerMemberships(dealerId);
  const { data: units } = useUnits(dealerId);
  const createUser = useCreateDealerUser();
  const resetPw = useResetPassword();
  const suspendDealer = useSuspendDealer();
  const { toast } = useToast();

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreds, setShowCreds] = useState<{ email: string; password: string } | null>(null);
  const [showResetPw, setShowResetPw] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [userForm, setUserForm] = useState({ email: "", full_name: "", password: "", role: "dealer_staff" });
  const [unitSearch, setUnitSearch] = useState("");

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const handleCreateUser = async () => {
    const password = userForm.password || generatePassword();
    try {
      await createUser.mutateAsync({
        dealer_id: dealerId!,
        email: userForm.email,
        password,
        full_name: userForm.full_name,
        role: userForm.role,
      });
      setShowCreateUser(false);
      setShowCreds({ email: userForm.email, password });
      setUserForm({ email: "", full_name: "", password: "", role: "dealer_staff" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleResetPw = async () => {
    const pw = newPw || generatePassword();
    try {
      await resetPw.mutateAsync({ user_id: showResetPw!, new_password: pw });
      setShowResetPw(null);
      setNewPw("");
      toast({ title: "Password reset", description: `New password: ${pw}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filteredUnits = units?.filter((u: any) => {
    if (!unitSearch) return true;
    const s = unitSearch.toLowerCase();
    return [u.make, u.model, u.vin, u.stock_number, String(u.year)].some((v) => v?.toLowerCase().includes(s));
  });

  if (!dealer) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{dealer.name}</h1>
          <Badge variant={dealer.is_active ? "default" : "destructive"} className={dealer.is_active ? "bg-primary/20 text-primary border-primary/30 mt-2" : "mt-2"}>
            {dealer.is_active ? "Active" : "Suspended"}
          </Badge>
        </div>
        <Button
          variant={dealer.is_active ? "destructive" : "hero"}
          onClick={async () => {
            await suspendDealer.mutateAsync({ dealer_id: dealer.id, suspend: dealer.is_active });
            toast({ title: dealer.is_active ? "Suspended" : "Unsuspended" });
          }}
        >
          {dealer.is_active ? "Suspend" : "Unsuspend"}
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="glass-panel border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Users</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{memberships?.length ?? 0}</div></CardContent>
            </Card>
            <Card className="glass-panel border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Units</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{units?.length ?? 0}</div></CardContent>
            </Card>
            <Card className="glass-panel border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Created</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{format(new Date(dealer.created_at), "MMM d, yyyy")}</div></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="hero" size="sm" onClick={() => setShowCreateUser(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create User
            </Button>
          </div>
          <Card className="glass-panel border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships?.map((m: any) => (
                    <TableRow key={m.user_id}>
                      <TableCell className="font-medium">{m.profiles?.full_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{m.profiles?.email}</TableCell>
                      <TableCell><Badge variant="outline">{m.role}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={m.is_active ? "default" : "destructive"} className={m.is_active ? "bg-primary/20 text-primary border-primary/30" : ""}>
                          {m.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setShowResetPw(m.user_id)}>
                          <KeyRound className="h-3 w-3 mr-1" /> Reset PW
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!memberships?.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No users</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units" className="space-y-4">
          <Input
            placeholder="Search units by make, model, VIN…"
            value={unitSearch}
            onChange={(e) => setUnitSearch(e.target.value)}
            className="max-w-sm"
          />
          <Card className="glass-panel border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock #</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>VIN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnits?.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-sm">{u.stock_number || "—"}</TableCell>
                      <TableCell className="font-medium">{u.year} {u.make} {u.model}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{u.vin || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{u.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(u.created_at), "MMM d")}</TableCell>
                    </TableRow>
                  ))}
                  {!filteredUnits?.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No units</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="glass-panel-strong">
          <DialogHeader>
            <DialogTitle>Create Dealer User</DialogTitle>
            <DialogDescription>Add a user to {dealer.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dealer_admin">Dealer Admin</SelectItem>
                  <SelectItem value="dealer_staff">Dealer Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Password (auto-generated if empty)</label>
              <Input value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateUser(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleCreateUser} disabled={!userForm.email || createUser.isPending}>
              {createUser.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog open={!!showCreds} onOpenChange={() => setShowCreds(null)}>
        <DialogContent className="glass-panel-strong">
          <DialogHeader>
            <DialogTitle>User Created ✓</DialogTitle>
            <DialogDescription>Save these credentials.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 bg-muted/50 rounded-lg p-4 font-mono text-sm">
            <div><span className="text-muted-foreground">Email:</span> {showCreds?.email}</div>
            <div><span className="text-muted-foreground">Password:</span> {showCreds?.password}</div>
          </div>
          <DialogFooter>
            <Button variant="hero" onClick={() => {
              navigator.clipboard.writeText(`Email: ${showCreds?.email}\nPassword: ${showCreds?.password}`);
              toast({ title: "Copied" });
            }}>Copy</Button>
            <Button variant="ghost" onClick={() => setShowCreds(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!showResetPw} onOpenChange={() => setShowResetPw(null)}>
        <DialogContent className="glass-panel-strong">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter a new password or leave blank to auto-generate.</DialogDescription>
          </DialogHeader>
          <Input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Leave blank to auto-generate" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowResetPw(null)}>Cancel</Button>
            <Button variant="hero" onClick={handleResetPw} disabled={resetPw.isPending}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
