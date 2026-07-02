import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchUserRole(userId: string): Promise<string | null> {
    console.log(`Starting role check for user: ${userId}`);
    
    const roleQuery = supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Role query timed out")), 5000)
    );

    try {
      const result = await Promise.race([roleQuery, timeoutPromise]) as any;
      if (result.error) throw result.error;
      const role = result.data?.role || null;
      console.log(`Role query completed: ${role}`);
      return role;
    } catch (err: any) {
      console.error(`Failed to fetch admin role: ${err.message || err}`);
      return null;
    }
  }

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (!active) return;
      setLoading(true);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const role = await fetchUserRole(s.user.id);
        if (active) {
          setIsAdmin(role === "admin");
        }
      } else {
        setIsAdmin(false);
      }
      console.log("Setting loading to false");
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        const role = await fetchUserRole(data.session.user.id);
        if (active) {
          setIsAdmin(role === "admin");
        }
      } else {
        setIsAdmin(false);
      }
      console.log("Setting loading to false");
      setLoading(false);
    }).catch((err) => {
      console.error("Failed to get session:", err);
      if (active) {
        console.log("Setting loading to false");
        setLoading(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        isAdmin,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
