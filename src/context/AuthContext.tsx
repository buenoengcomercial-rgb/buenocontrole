import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { User, Session } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'seguranca_docs';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  active: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (login: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  logAction: (action: string, entityType: string, entityId?: string, details?: Record<string, Json | undefined>) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const activeUserIdRef = useRef<string | null>(null);
  const loadedProfileUserIdRef = useRef<string | null>(null);
  const loadingProfileUserIdRef = useRef<string | null>(null);

  const fetchProfileAndRole = useCallback(async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
    ]);

    if (activeUserIdRef.current !== userId) return false;

    if (profileRes.data) {
      // If user is deactivated, force sign out and block access
      if (profileRes.data.active === false) {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        return false;
      }
      setProfile({
        id: profileRes.data.id,
        username: profileRes.data.username,
        full_name: profileRes.data.full_name,
        active: profileRes.data.active,
      });
    }
    if (roleRes.data) {
      setRole(roleRes.data.role as AppRole);
    }
    return true;
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      activeUserIdRef.current = nextSession?.user?.id ?? null;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        loadedProfileUserIdRef.current = null;
        loadingProfileUserIdRef.current = null;
        setProfile(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const userId = nextSession.user.id;
      const forceReload = event === 'USER_UPDATED';
      const alreadyLoaded = loadedProfileUserIdRef.current === userId && !forceReload;
      const alreadyLoading = loadingProfileUserIdRef.current === userId;

      if (alreadyLoaded) {
        setLoading(false);
        return;
      }

      if (alreadyLoading) return;

      if (loadedProfileUserIdRef.current !== userId) {
        setProfile(null);
        setRole(null);
      }

      loadingProfileUserIdRef.current = userId;
      setLoading(true);

      // Defer database access until the Supabase auth callback has finished.
      setTimeout(() => {
        fetchProfileAndRole(userId)
          .then((loaded) => {
            if (loaded) loadedProfileUserIdRef.current = userId;
          })
          .catch((error) => {
            console.error('Erro ao carregar perfil do usuario:', error);
          })
          .finally(() => {
            if (loadingProfileUserIdRef.current === userId) {
              loadingProfileUserIdRef.current = null;
            }
            setLoading(false);
          });
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileAndRole]);

  const signIn = useCallback(async (login: string, password: string) => {
    const email = login.includes('@') ? login : `${login}@buenocontrole.app`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: 'Login ou senha inválidos' };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  }, []);

  const logAction = useCallback(async (action: string, entityType: string, entityId?: string, details?: Record<string, Json | undefined>) => {
    if (!user) return;
    await supabase.from('audit_log').insert([{
      user_id: user.id,
      username: profile?.username || user.email || '',
      action,
      entity_type: entityType,
      entity_id: entityId || '',
      details: details || {},
    }]);
  }, [user, profile]);

  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, isAdmin, signIn, signOut, logAction }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
