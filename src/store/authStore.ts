"use client";

import { create } from "zustand";

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrate: () => void;
}

let didHydrate = false;

export const useAuthStore = create<AuthStore>((setState) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: () => {
    if (didHydrate) return;
    didHydrate = true;

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data: { user: AuthUser | null }) => {
        if (data.user) {
          setState({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      })
      .catch(() => {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      });
  },
}));
