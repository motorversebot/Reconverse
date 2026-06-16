import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentDealer, useDealerMembers } from "@/hooks/useDealerData";
import { useCreateDealerUser, useResetDealerUserPassword, useRemoveDealerUser, useUpdateDealerUser } from "@/hooks/useDealerActions";
import { useToast } from "@/hooks/use-toast";
import { Plus, KeyRound, UserMinus } from "lucide-react";
import { format } from "date-fns";
import { canManageUsers, roleLabel, ASSIGNABLE_ROLES, type DealerRole } from "@/lib/permissions";

export default function DealerUsersPage() {
  const { data: membership } = useCurrentDealer();
  const dealerId = membership?.dealer_id ?? "";
  const isUserAdmin = canManageUsers(membership?.role);
  const { data: members, error: membersError, isLoading: membersLoading } = useDealerMembers(dealerId);
  const createUser = useCreateDealerUser();
  const resetPassword = useResetDealerUserPassword();
  const removeUser = useRemoveDealerUser();
  const updateUser = useUpdateDealerUser();
  const { toast } = useToast();

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateUser.mutateAsync({ userId, role });
      toast({ title: "Role updated", description: roleLabel(role) });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<DealerRole>("staff");
  const [newPassword, setNewPassword] = useState("");

  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState("");
  const [resetPw, setResetPw] = useState("");

  const handleCreate = async () => {
    try {
      await createUser.mutateAsync({
        dealer_id: dealerId,
        email: newEmail,
        password: newPassword,
        full_name: newName,
        role: newRole,
      });
      toast({ title: "User created", description: `${newEmail} added as ${roleLabel(newRole)}` });
      setCreateOpen(false);
      setNewEmail(""); setNewName(""); setNewPassword(""); setNewRole("staff");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleReset = async () => {
    try {
      await resetPassword.mutateAsync({ userId: resetUserId, newPassword: resetPw });
      toast({ title: "Password reset successfully" });
      setResetOpen(false);
      setResetPw("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this user from the dealership?")) return;
    try {
      await removeUser.mutateAsync({ userId, dealerId });
      toast({ title: "User removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your team</p>
        </div>
        {isUserAdmin && (
          <Button variant="hero" size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create User
          </Button>
        )}
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
                <TableHead>Joined</TableHead>
                {isUserAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((m: any) => (
                <TableRow key={m.user_id}>
                  <TableCell className="font-medium">{m.profiles?.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{m.profiles?.email}</TableCell>
                  <TableCell>
                    {isUserAdmin && m.user_id !== membership?.user_id ? (
                      <Select value={m.role} onValueChange={(v) => handleRoleChange(m.user_id, v)}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="status-pill text-xs">{roleLabel(m.role)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs ${m.is_active ? "text-primary" : "text-destructive"}`}>
                      {m.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(m.created_at), "MMM d, yyyy")}</TableCell>
                  {isUserAdmin && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setResetUserId(m.user_id); setResetOpen(true); }}
                          title="Reset Password"
                        >
                          <KeyRound className="h-3 w-3" />
                        </Button>
                        {m.user_id !== membership?.user_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(m.user_id)}
                            className="text-destructive hover:text-destructive"
                            title="Remove User"
                          >
                            <UserMinus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {membersLoading && (
                <TableRow>
                  <TableCell colSpan={isUserAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">Loading users…</TableCell>
                </TableRow>
              )}
              {membersError && (
                <TableRow>
                  <TableCell colSpan={isUserAdmin ? 6 : 5} className="text-center text-destructive py-8">
                    Error loading users: {membersError.message}
                  </TableCell>
                </TableRow>
              )}
              {!membersLoading && !membersError && !members?.length && (
                <TableRow>
                  <TableCell colSpan={isUserAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">No users found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="glass-panel-strong border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Full Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Email</label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Temporary Password</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Role</label>
              <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleCreate} disabled={createUser.isPending || !newEmail || !newPassword}>
              {createUser.isPending ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="glass-panel-strong border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">New Password</label>
            <Input type="password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} placeholder="••••••••" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleReset} disabled={resetPassword.isPending || !resetPw}>
              {resetPassword.isPending ? "Resetting…" : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
