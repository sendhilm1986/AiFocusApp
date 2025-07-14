"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface SessionContextType {
  session: Session | null;
  supabase: SupabaseClient;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // This function runs once on mount to get the initial session state
    const getInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setLoading(false);

      const currentPath = window.location.pathname;
      if (!initialSession && currentPath !== '/login') {
        router.push('/login');
      } else if (initialSession && currentPath === '/login') {
        router.push('/');
      }
    };

    getInitialSession();

    // This listener handles all subsequent auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth state change:", event, "Session:", !!newSession);
      setSession(newSession);

      const currentPath = window.location.pathname;

      if (event === 'SIGNED_OUT' || !newSession) {
        if (event === 'SIGNED_OUT') {
          toast.success("You have been signed out.");
        }
        if (currentPath !== '/login') {
          router.push('/login');
        }
      } else if (newSession && currentPath === '/login') {
        router.push('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const value = useMemo(() => ({ session, supabase }), [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading application...</p>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};