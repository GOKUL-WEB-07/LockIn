import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authApi } from "../services/api";
import type { Profile } from "../services/types";
import { supabase } from "../lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);
  const activeUser = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let alive = true;
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        if (!alive) return;
        const version = ++profileRequest.current;
        const nextUser = next?.user.id ?? null;
        if (activeUser.current !== nextUser) {
          setProfile(null);
          setProfileError(null);
          setLoading(Boolean(next));
        }
        activeUser.current = nextUser;
        setSession(next);
        if (!next) {
          setProfile(null);
          setProfileError(null);
          setLoading(false);
        } else
          window.setTimeout(() => {
            if (!alive || version !== profileRequest.current) return;
            void authApi
              .profile(next.user.id)
              .then((value) => {
                if (alive && version === profileRequest.current) {
                  setProfile(value);
                  setProfileError(null);
                }
              })
              .catch((cause) => {
                if (alive && version === profileRequest.current)
                  setProfileError(
                    cause instanceof Error
                      ? cause.message
                      : "Profile could not load.",
                  );
              })
              .finally(() => {
                if (alive && version === profileRequest.current) setLoading(false);
              });
          }, 0);
      },
    );
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function refreshProfile() {
    if (session?.user) {
      const version = ++profileRequest.current;
      try {
        const next = await authApi.profile(session.user.id);
        if (version !== profileRequest.current || activeUser.current !== session.user.id) return;
        setProfile(next);
        setProfileError(null);
      } catch (cause) {
        if (version === profileRequest.current && activeUser.current === session.user.id)
          setProfileError(cause instanceof Error ? cause.message : "Profile could not load.");
        throw cause;
      }
    }
  }
  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    profile,
    profileError,
    loading,
    signIn: async (email, password) => {
      await authApi.signIn(email, password);
    },
    signUp: async (email, password) => {
      const result = await authApi.signUp(email, password);
      return Boolean(result.session);
    },
    signOut: authApi.signOut,
    refreshProfile,
  };
  useEffect(() => {
    document.documentElement.dataset.theme =
      profile?.selected_theme || "default";
  }, [profile?.selected_theme]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
