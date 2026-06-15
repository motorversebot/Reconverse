import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useProfiles, useDealers } from "@/hooks/usePlatformData";
import { useResetPassword, useUpdateMembershipRole, useToggleUserActive } from "@/hooks/usePlatformActions";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, UserX, UserCheck, Shield } from "lucide-react";

interface ProfileMembership {
  dealer_id: string;
  role: string;
  is_active: boolean;
  dealers?: { name?: string | null } | null;
}

interface PlatformProfile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  is_platform_admin?: boolean;
  dealer_memberships?: ProfileMembership[] | null;
}

export default function UsersPage() {
  const { data: profiles, isLoading } = useProfiles();
  const { data: dealers } = useDealers();
  const resetPw = useResetPassword();
  const updateRole = useUpdateMembershipRole();
  const toggleActive = useToggleUserActive();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterDealer, setFilterDealer] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [showResetPw, setShowResetPw] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const filtered = (profiles as PlatformProfile[] | undefined)?.filter((p) => {
    if (search) {
      const s = search.toLowerCase();
      if (!p.email?.toLowerCase().includes(s) && !p.full_name?.toLowerCase().includes(s)) return false;
    }
    if (filterDealer !== "all") {
      if (!p.dealer_memberships?.some((m) => m.dealer_id === filterDealer)) return false;
    }
    if (filterRole !== "all") {
      if (!p.dealer_memberships?.some((m) => m.role === filterRole)) return false;
    }
    return true;
  });

  const handleResetPw = async () => {
    const pw = newPw || generatePassword();
    try {
      await resetPw.mutateAsync({ user_id: showResetPw!, new_password: pw });
      setShowResetPw(null);
      setNewPw("");
      toast({ title: "Password reset", description: `New password: ${pw}` });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const handleToggleActive = async (userId: string, dealerId: string, currentActive: boolean) => {
    try {
      await toggleActive.mutateAsync({ user_id: userId, dealer_id: dealerId, is_active: !currentActive });
      toast({ title: currentActive ? "User disabled" : "User enabled" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const handleChangeRole = async (userId: string, dealerId: string, newRole: string) => {
    try {
      await updateRole.mutateAsync({ user_id: userId, dealer_id: dealerId, role: newRole });
      toast({ title: "Role updated" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-1">All platform users across dealerships</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterDealer} onValueChange={setFilterDealer}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Dealers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dealers</SelectItem>
            {dealers?.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="dealer_admin">Dealer Admin</SelectItem>
            <SelectItem value="dealer_staff">Dealer Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass-panel border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Dealership</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {filtered?.map((p) => {
                const membership = p.dealer_memberships?.[0];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {p.full_name || "—"}
                        {p.is_platform_admin && <Shield className="h-3 w-3 text-primary" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.email}</TableCell>
                    <TableCell className="text-muted-foreground">{membership?.dealers?.name || "—"}</TableCell>
                    <TableCell>
                      {membership ? (
                        <Select
                          value={membership.role}
                          onValueChange={(v) => handleChangeRole(p.id, membership.dealer_id, v)}
                        >
                          <SelectTrigger className="w-32 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dealer_admin">dealer_admin</SelectItem>
                            <SelectItem value="dealer_staff">dealer_staff</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {membership ? (
                        <Badge variant={membership.is_active ? "default" : "destructive"} className={membership.is_active ? "bg-primary/20 text-primary border-primary/30" : ""}>
                          {membership.is_active ? "Active" : "Inactive"}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setShowResetPw(p.id)} title="Reset Password">
                          <KeyRound className="h-3 w-3" />
                        </Button>
                        {membership && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(p.id, membership.dealer_id, membership.is_active)}
                            title={membership.is_active ? "Disable" : "Enable"}
                          >
                            {membership.is_active ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && !filtered?.length && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No users found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
