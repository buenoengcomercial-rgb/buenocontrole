import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  logAction: (action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = useCallback(async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
    ]);
    if (profileRes.data) {
      // If user is deactivated, force sign out and block access
      if (profileRes.data.active === false) {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        return;
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
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Use setTimeout to avoid potential deadlock with Supabase client
        setTimeout(() => fetchProfileAndRole(session.user.id), 0);
      } else {
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndRole(session.user.id);
      }
      setLoading(false);
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

  const logAction = useCallback(async (action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from('audit_log').insert([{
      user_id: user.id,
      username: profile?.username || user.email || '',
      action,
      entity_type: entityType,
      entity_id: entityId || '',
      details: (details || {}) as any,
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
