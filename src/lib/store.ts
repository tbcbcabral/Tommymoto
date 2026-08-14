import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  setSession: (session: Session | null) => void;
  isInitialized: boolean;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  isInitialized: false,
  setInitialized: (initialized) => set({ isInitialized: initialized }),
}));
