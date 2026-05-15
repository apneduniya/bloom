"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SessionState = {
  sessionId: string | null;
  hasHydrated: boolean;
  setSessionId: (id: string) => void;
  clear: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: null,
      hasHydrated: false,
      setSessionId: (id) => set({ sessionId: id }),
      clear: () => set({ sessionId: null }),
    }),
    {
      name: "bloom.appwrite.sessionId",
      storage: createJSONStorage(() => (typeof window === "undefined" ? (undefined as unknown as Storage) : window.localStorage)),
      partialize: (state) => ({ sessionId: state.sessionId }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    },
  ),
);
