import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  RVUser,
  login as apiLogin,
  logout as apiLogout,
  getMe,
  getAccess,
  getRefresh,
  setOnAuthLost,
} from "@/lib/api";

interface AuthContext {
  session: { user: RVUser } | null;
  user: RVUser | null;
  isPlatformAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContext | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RVUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOnAuthLost(() => { setUser(null); });

    async function bootstrap() {
      if (!getAccess() && !getRefresh()) {
        setLoading(false);
        return;
      }
      try {
        const me = await getMe();
        setUser(me);
      } catch {
        setUser(null);
      }
      setLoading(false);
    }
    bootstrap();
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    if (!result.ok) return { error: new Error(result.error) };
    setUser(result.user);
    return { error: null };
  };

  const signOut = async () => {
    await apiLogout();
    setUser(null);
  };

  const session = user ? { user } : null;
  const isPlatformAdmin = user?.is_platform_admin === true;

  return (
    <AuthContext.Provider value={{ session, user, isPlatformAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
