"use client";

import { create } from "zustand";
import { authClient } from "../lib/auth/client";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
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

    authClient
      .getSession()
      .then(({ data }) => {
        if (data?.user) {
          setState({
            user: {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              image: data.user.image,
            },
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
