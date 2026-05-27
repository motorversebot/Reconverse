import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch, changePassword as apiChangePassword, changeEmailRequest, logout as apiLogout } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { User, Shield, KeyRound, LogOut, Save, Mail, Sun, Moon, Monitor } from "lucide-react";

type Theme = "dark" | "light" | "system";

function getStoredTheme(): Theme {
  return (localStorage.getItem("mv-theme") as Theme) || "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("light", !prefersDark);
  } else {
    root.classList.toggle("light", theme === "light");
  }
  localStorage.setItem("mv-theme", theme);
}

// Apply on load
applyTheme(getStoredTheme());

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameReadOnly, setUsernameReadOnly] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Sign out all
  const [signOutLoading, setSignOutLoading] = useState(false);

  // Last sign in
  const lastSignIn = user?.last_sign_in_at;

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const res = await apiFetch("/api/v1/auth/me");
      const j = await res.json().catch(() => null);
      const data = j?.ok ? j.data.user : null;
      if (data) {
        setDisplayName(data.full_name ?? "");
        setUsername((data as any).username ?? "");
        setUsernameReadOnly(!!(data as any).username);
      }
    };
    loadProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    const updateData: Record<string, string> = { full_name: displayName.trim() };
    if (!usernameReadOnly && username.trim()) {
      updateData.username = username.trim();
    }
    const res = await apiFetch("/api/v1/reconverse/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });
    const j = await res.json().catch(() => null);
    const error = (!res.ok || !j?.ok) ? new Error(j?.error || "Update failed") : null;
    setProfileLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated", description: "Your profile has been saved." });
      if (!usernameReadOnly && username.trim()) setUsernameReadOnly(true);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim()) return;
    setEmailLoading(true);
    const result = await changeEmailRequest(newEmail.trim(), "");
      const error = !result.ok ? new Error(result.error) : null;
    setEmailLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Confirmation sent", description: "Check your new email to confirm the change." });
      setNewEmail("");
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setPasswordLoading(true);
    // Re-authenticate with current password
    const _pwRes = await apiChangePassword(currentPassword, newPassword);
    if (!_pwRes.ok) {
      setPasswordLoading(false);
      toast({ title: "Error", description: _pwRes.error || "Current password is incorrect.", variant: "destructive" });
      return;
    }
    const error = null;
    setPasswordLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "Your password has been changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleSignOutAll = async () => {
    setSignOutLoading(true);
    await apiLogout();
    setSignOutLoading(false);
    signOut();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card className="glass-panel border-border">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Your public identity</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Username {usernameReadOnly && <span className="text-xs text-muted-foreground">(read-only)</span>}
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                readOnly={usernameReadOnly}
                className={usernameReadOnly ? "opacity-60 cursor-not-allowed" : ""}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="hero" size="sm" onClick={handleSaveProfile} disabled={profileLoading} className="gap-2">
              <Save className="h-4 w-4" />
              {profileLoading ? "Saving…" : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="glass-panel border-border">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sun className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Appearance</CardTitle>
            <CardDescription>Choose your preferred theme</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex gap-3">
            {([
              { value: "dark" as Theme, icon: Moon, label: "Dark" },
              { value: "light" as Theme, icon: Sun, label: "Light" },
              { value: "system" as Theme, icon: Monitor, label: "System" },
            ]).map(({ value, icon: Icon, label }) => (
              <Button
                key={value}
                variant={theme === value ? "hero" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => { setTheme(value); applyTheme(value); }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card className="glass-panel border-border">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <KeyRound className="h-5 w-5 text-accent" />
          </div>
          <div>
            <CardTitle className="text-lg">Account</CardTitle>
            <CardDescription>Email &amp; password management</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {/* Email */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" /> Change Email
            </h3>
            <p className="text-xs text-muted-foreground">Current: {user?.email}</p>
            <div className="flex gap-3">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@email.com"
                className="max-w-sm"
              />
              <Button variant="outline" size="sm" onClick={handleEmailChange} disabled={emailLoading || !newEmail.trim()}>
                {emailLoading ? "Sending…" : "Send Confirmation"}
              </Button>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Password */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" /> Change Password
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePasswordChange}
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            >
              {passwordLoading ? "Updating…" : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="glass-panel border-border">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Shield className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-lg">Security</CardTitle>
            <CardDescription>Session management</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {lastSignIn && (
            <p className="text-sm text-muted-foreground">
              Last sign-in: {new Date(lastSignIn).toLocaleString()}
            </p>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSignOutAll}
            disabled={signOutLoading}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            {signOutLoading ? "Signing out…" : "Sign Out All Devices"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
