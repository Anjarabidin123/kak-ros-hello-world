import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signInWithUsername: (username: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, username: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  verifyAdminPassword: (password: string) => Promise<boolean>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthContext useEffect: Starting auth setup', { supabase: !!supabase });
    
    let subscription: any;

    try {
      // Check if supabase and auth are available
      if (!supabase || !supabase.auth) {
        console.error('Supabase or auth not available');
        setLoading(false);
        return;
      }

      console.log('Setting up auth state listener');
      
      // Set up auth state listener with additional safety checks
      const authResult = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log('Auth state change:', event, !!session);
          try {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
          } catch (error) {
            console.error('Error in auth state change callback:', error);
            setLoading(false);
          }
        }
      );

      console.log('Auth result:', authResult);

      if (authResult?.data?.subscription) {
        subscription = authResult.data.subscription;
        console.log('Auth subscription created successfully');
      }
    } catch (error) {
      console.error('Error setting up auth subscription:', error);
      setLoading(false);
    }

    // Get existing session
    try {
      console.log('Getting existing session');
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('Got existing session:', !!session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }).catch(error => {
        console.error('Error getting session:', error);
        setLoading(false);
      });
    } catch (error) {
      console.error('Error in getSession call:', error);
      setLoading(false);
    }

    return () => {
      console.log('AuthContext cleanup');
      try {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
          console.log('Auth subscription unsubscribed successfully');
        }
      } catch (error) {
        console.error('Error unsubscribing from auth:', error);
      }
    };
  }, []);

  const signUp = async (email: string, username: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithUsername = async (username: string, password: string) => {
    // Use RPC with SECURITY DEFINER to bypass RLS when not authenticated
    const { data, error } = await supabase.rpc('get_user_by_username_or_email' as any, {
      identifier: username,
    });

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      return { error: { message: 'Username tidak ditemukan' } };
    }

    const record = Array.isArray(data) ? data[0] : data;
    if (!record?.email) {
      return { error: { message: 'Username tidak ditemukan' } };
    }

    return signIn(record.email, password);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const verifyAdminPassword = async (password: string): Promise<boolean> => {
    // Simplified to use the same constant as AdminProtection to avoid DB dependency
    return password === '122344566';
  };

  const value = {
    user,
    session,
    signIn,
    signInWithUsername,
    signUp,
    signOut,
    verifyAdminPassword,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};