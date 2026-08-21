import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  retryAnonymousSignIn: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  isLoading: true,
  error: null,
  retryAnonymousSignIn: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [signInAttempt, setSignInAttempt] = useState(0);
  const recoveryInFlightRef = useRef(false);

  const retryAnonymousSignIn = useCallback(() => {
    setError(null);
    setIsLoading(true);
    recoveryInFlightRef.current = true;
    setSignInAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      const { data: { session: existing }, error: sessionError } =
        await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionError) {
        setError(sessionError);
        recoveryInFlightRef.current = false;
        setIsLoading(false);
        return;
      }

      if (existing) {
        setSession(existing);
        setError(null);
        recoveryInFlightRef.current = false;
        setIsLoading(false);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInAnonymously();
      if (cancelled) return;

      if (signInError) {
        setSession(null);
        setError(signInError);
      } else {
        setSession(data.session);
        setError(null);
      }
      recoveryInFlightRef.current = false;
      setIsLoading(false);
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [signInAttempt]);

  useEffect(() => {
    let cancelled = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (cancelled) return;
        setSession(newSession);
        if (event === 'SIGNED_OUT' && !recoveryInFlightRef.current) {
          recoveryInFlightRef.current = true;
          setError(null);
          setIsLoading(true);
          setSignInAttempt((attempt) => attempt + 1);
        }
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        error,
        retryAnonymousSignIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
